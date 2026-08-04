import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Injectable()
export class CartService {
  constructor(private readonly supabase: SupabaseClient) {}

  // 1. Получить корзину пользователя
  async getUserCart(userId: string) {
    try {
      const { data: rawItems, error } = await this.supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', userId)
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
          .select('id, store_name, balance_rub, status')
          .in('id', cardIds);
        cards?.forEach((c) => cardsMap.set(c.id, c));
      }

      if (setIds.length > 0) {
        const { data: sets } = await this.supabase
          .from('voucher_sets')
          .select('id, title, total_price_rub, status')
          .in('id', setIds);
        sets?.forEach((s) => setsMap.set(s.id, s));
      }

      return rawItems.map((item) => ({
        id: item.id,
        itemType: item.item_type,
        quantity: item.quantity,
        details:
          item.item_type === 'card'
            ? cardsMap.get(item.card_id)
            : setsMap.get(item.set_id),
      }));
    } catch (err) {
      console.error('🔥 CartService getUserCart Error:', err);
      throw err;
    }
  }

  // 2. Добавить товар в корзину с защитой от отсутствующего user_id
  async addToCart(dto: AddToCartDto) {
    if (!dto.userId || !dto.itemType || !dto.itemId) {
      throw new BadRequestException('Не все обязательные поля переданы.');
    }

    // Проверка наличия пользователя в БД
    const { data: existingUser } = await this.supabase
      .from('users')
      .select('id')
      .eq('id', dto.userId)
      .maybeSingle();

    let targetUserId = dto.userId;

    // Защитный механизм: если user_id с фронтенда отсутствует в БД, создаем его
    if (!existingUser) {
      console.warn(`⚠️ User ID ${dto.userId} не найден в БД. Создаем запись...`);
      const { data: newUser, error: userError } = await this.supabase
        .from('users')
        .insert([{ id: dto.userId, wechat_openid: `auto_${dto.userId}` }])
        .select()
        .single();

      if (userError || !newUser) {
        // Если передан невалидный UUID, генерируем новый рабочий
        const { data: fallbackUser, error: fallbackError } = await this.supabase
          .from('users')
          .insert([{ wechat_openid: `fallback_${Date.now()}` }])
          .select()
          .single();

        if (fallbackError || !fallbackUser) {
          throw new InternalServerErrorException(
            'Не удалось привязать пользователя к корзине.',
          );
        }
        targetUserId = fallbackUser.id;
      }
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

  // 3. Удалить позицию из корзины
  async removeFromCart(cartItemId: string, userId: string) {
    const { error } = await this.supabase
      .from('cart_items')
      .delete()
      .eq('id', cartItemId)
      .eq('user_id', userId);

    if (error) throw new InternalServerErrorException(error.message);
    return { success: true };
  }

  // 4. Полная очистка корзины
  async clearCart(userId: string) {
    const { error } = await this.supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId);

    if (error) throw new InternalServerErrorException(error.message);
    return { success: true };
  }
  async checkout(userId: string) {
  // 1. Берем товары из корзины
  const cartItems = await this.getUserCart(userId);

  if (!cartItems || cartItems.length === 0) {
    throw new BadRequestException('Корзина пуста');
  }

  // 2. Формируем массив купленных карт
  const newCards = cartItems.map((item: any) => ({
    user_id: userId,
    voucher_id: item.card_id || item.item_id || item.id,
    title: item.details?.store_name || item.details?.title || 'Подарочная карта',
    balance_rub: item.details?.balance_rub || item.details?.total_price_rub || 0,
    code: 'CARD-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
    status: 'ACTIVE',
  }));

  // 3. Вставляем в таблицу user_cards
  const { error: insertErr } = await this.supabase
    .from('user_cards')
    .insert(newCards);

  if (insertErr) {
    throw new Error(`Ошибка при сохранении карт: ${insertErr.message}`);
  }

  // 4. Очищаем корзину после успешной покупки
  await this.clearCart(userId);

  return { success: true, message: 'Покупка прошла успешно' };
}
}