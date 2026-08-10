import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { AddToCartDto } from './dto/add-to-cart.dto';

// Вспомогательная проверка на UUID
const IS_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class CartService {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Гарантирует наличие пользователя в public.users и возвращает его НАСТОЯЩИЙ UUID id из БД
   */
  private async ensureUserExists(userId: string): Promise<string> {
    if (!userId) {
      throw new BadRequestException('userId не указан.');
    }

    const cleanUserId = String(userId).trim();
    const isUuid = IS_UUID_REGEX.test(cleanUserId);

    // 1. Если передан валидный UUID, проверяем по id
    if (isUuid) {
      const { data: userById } = await this.supabase
        .from('users')
        .select('id')
        .eq('id', cleanUserId)
        .maybeSingle();

      if (userById) {
        return userById.id;
      }
    }

    // 2. Проверяем по wechat_openid
    const { data: userByOpenid } = await this.supabase
      .from('users')
      .select('id')
      .eq('wechat_openid', `auto_${cleanUserId}`)
      .maybeSingle();

    if (userByOpenid) {
      return userByOpenid.id;
    }

    // 3. Создаем пользователя через fallback с автогенерацией UUID
    const { data: fallbackUser, error: fallbackErr } = await this.supabase
      .from('users')
      .insert([{ wechat_openid: `auto_${cleanUserId}` }])
      .select('id')
      .single();

    if (fallbackErr || !fallbackUser) {
      console.error('🔥 [ensureUserExists] Ошибка создания пользователя:', fallbackErr);
      throw new InternalServerErrorException(
        `Не удалось создать пользователя в БД: ${fallbackErr?.message}`,
      );
    }

    return fallbackUser.id;
  }

  /**
   * 1. Получить корзину пользователя
   */
  async getUserCart(userId: string) {
    try {
      const validUserId = await this.ensureUserExists(userId);

      const { data: rawItems, error } = await this.supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', validUserId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new InternalServerErrorException(
          `Ошибка получения корзины: ${error.message}`,
        );
      }

      if (!rawItems || rawItems.length === 0) return [];

      const cardIds = rawItems
        .filter((i) => i.item_type === 'card' && i.card_id)
        .map((i) => i.card_id);
      const setIds = rawItems
        .filter((i) => i.item_type === 'set' && i.set_id)
        .map((i) => i.set_id);

      const cardsMap = new Map();
      const setsMap = new Map();

      if (cardIds.length > 0) {
        const { data: cards } = await this.supabase
          .from('voucher_cards')
          .select('id, store_name, balance_rub, cost_price_rub, status')
          .in('id', cardIds);
        cards?.forEach((c) => cardsMap.set(c.id, c));
      }

      if (setIds.length > 0) {
        const { data: sets } = await this.supabase
          .from('voucher_sets')
          .select('id, title, total_balance_rub, total_nominal_rub, price_rub, status')
          .in('id', setIds);
        sets?.forEach((s) => setsMap.set(s.id, s));
      }

      return rawItems.map((item) => {
        const details =
          item.item_type === 'card'
            ? cardsMap.get(item.card_id)
            : setsMap.get(item.set_id);

        let price = 0;
        let balance = 0;
        let title = 'Подарочный ваучер';

        if (item.item_type === 'card') {
          balance = Number(details?.balance_rub ?? 0);
          price =
            details?.cost_price_rub !== null &&
            details?.cost_price_rub !== undefined
              ? Number(details.cost_price_rub)
              : balance;
          title = details?.store_name || 'Подарочная карта';
        } else {
          balance = Number(
            details?.total_balance_rub ?? details?.total_nominal_rub ?? 0,
          );
          price =
            details?.price_rub !== null && details?.price_rub !== undefined
              ? Number(details.price_rub)
              : balance;
          title = details?.title || 'Сет ваучеров';
        }

        return {
          id: item.id,
          item_type: item.item_type,
          itemType: item.item_type,
          quantity: item.quantity || 1,
          card_id: item.card_id || null,
          cardId: item.card_id || null,
          set_id: item.set_id || null,
          setId: item.set_id || null,
          title,
          balance_rub: balance,
          balanceRub: balance,
          price_rub: price,
          priceRub: price,
          details,
        };
      });
    } catch (err) {
      console.error('🔥 CartService getUserCart Error:', err);
      throw err;
    }
  }

  /**
   * 2. Добавить товар в корзину
   */
  async addToCart(dto: AddToCartDto) {
    if (!dto.userId || !dto.itemType || !dto.itemId) {
      throw new BadRequestException('Не все обязательные поля переданы.');
    }

    const targetUserId = await this.ensureUserExists(dto.userId);

    let checkQuery = this.supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('item_type', dto.itemType);

    if (dto.itemType === 'card') {
      checkQuery = checkQuery.eq('card_id', dto.itemId);
    } else {
      checkQuery = checkQuery.eq('set_id', dto.itemId);
    }

    const { data: existingItems } = await checkQuery;

    if (existingItems && existingItems.length > 0) {
      const existingItem = existingItems[0];
      const newQty = (existingItem.quantity || 1) + (dto.quantity || 1);

      const { data: updated, error: updateErr } = await this.supabase
        .from('cart_items')
        .update({ quantity: newQty })
        .eq('id', existingItem.id)
        .select();

      if (updateErr) throw new InternalServerErrorException(updateErr.message);
      return updated;
    }

    const payload: Record<string, any> = {
      user_id: targetUserId,
      item_type: dto.itemType,
      quantity: dto.quantity || 1,
    };

    if (dto.itemType === 'card') {
      payload.card_id = dto.itemId;
    } else if (dto.itemType === 'set') {
      payload.set_id = dto.itemId;
    }

    const { data, error } = await this.supabase
      .from('cart_items')
      .insert([payload])
      .select();

    if (error) {
      console.error('🔥 Supabase Cart Error:', error);
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  /**
   * 3. Удалить позицию из корзины
   */
  async removeFromCart(cartItemId: string, userId: string) {
    const validUserId = await this.ensureUserExists(userId);

    const { error } = await this.supabase
      .from('cart_items')
      .delete()
      .eq('id', cartItemId)
      .eq('user_id', validUserId);

    if (error) throw new InternalServerErrorException(error.message);
    return { success: true };
  }

  /**
   * 4. Очистить корзину полностью
   */
  async clearCart(userId: string) {
    const validUserId = await this.ensureUserExists(userId);

    const { error } = await this.supabase
      .from('cart_items')
      .delete()
      .eq('user_id', validUserId);

    if (error) throw new InternalServerErrorException(error.message);
    return { success: true };
  }

  /**
   * 5. Оформление заказа (Checkout)
   */


  async checkout(userId: string) {
  const validUserId = await this.ensureUserExists(userId);
  const cartItems = await this.getUserCart(validUserId);

  if (!cartItems || cartItems.length === 0) {
    throw new BadRequestException('Корзина пуста');
  }

  const cardsToInsert: any[] = [];
  const setsToInsert: any[] = [];

  for (const item of cartItems) {
    const count = item.quantity || 1;
    const targetCardId = item.cardId || item.card_id;
    const targetSetId = item.setId || item.set_id;

    if (item.itemType === 'card' && targetCardId) {
      for (let i = 0; i < count; i++) {
        cardsToInsert.push({
          user_id: validUserId,
          voucher_card_id: String(targetCardId),
          store_name: item.title || 'Подарочная карта',
          balance_rub: Number(item.balanceRub ?? 0),
          cost_price_rub: Number(item.priceRub ?? 0),
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        });
      }
    } else if (item.itemType === 'set' && targetSetId) {
      for (let i = 0; i < count; i++) {
        setsToInsert.push({
          user_id: validUserId,
          voucher_set_id: String(targetSetId),
          title: item.title || 'Сет ваучеров',
          total_nominal_rub: Number(item.balanceRub ?? 0),
          balance_rub: Number(item.balanceRub ?? 0),
          price_rub: Number(item.priceRub ?? 0),
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  if (cardsToInsert.length > 0) {
    const { error: cardErr } = await this.supabase
      .from('user_cards')
      .insert(cardsToInsert);

    if (cardErr) {
      console.error('🔥 User Cards Insert Error:', cardErr);
      throw new InternalServerErrorException(
        `Ошибка сохранения карт: ${cardErr.message}`,
      );
    }
  }

  if (setsToInsert.length > 0) {
    const { error: setErr } = await this.supabase
      .from('user_voucher_sets')
      .insert(setsToInsert);

    if (setErr) {
      console.error('🔥 User Voucher Sets Insert Error:', setErr);
      throw new InternalServerErrorException(
        `Ошибка сохранения сетов: ${setErr.message}`,
      );
    }
  }

  await this.clearCart(validUserId);

  return { success: true, message: 'Покупка прошла успешно' };
}
}