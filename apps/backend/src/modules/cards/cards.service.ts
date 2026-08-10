import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class CardsService {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Нормализует userId: ищет UUID пользователя в таблице users.
   * Если userId передан как telegram_id или строковый ID, возвращает реальный user.id.
   */
  private async resolveUserId(userId: string): Promise<string> {
    const { data: user } = await this.supabase
      .from('users')
      .select('id')
      .or(`id.eq.${userId},telegram_id.eq.${userId}`)
      .maybeSingle();

    return user?.id || userId;
  }

  async buyCard(userId: string, cardId: string, type: string) {
    const validUserId = await this.resolveUserId(userId);

    const { data: card, error: fetchErr } = await this.supabase
      .from(type === 'set' ? 'voucher_sets' : 'voucher_cards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (fetchErr || !card) {
      throw new InternalServerErrorException('Карта не найдена');
    }

    const { data: newPurchasedCard, error: insertErr } = await this.supabase
      .from('user_cards')
      .insert({
        user_id: validUserId,
        voucher_id: card.id,
        title: card.store_name || card.title || 'Ваучер',
        balance_rub: card.balance_rub || card.total_price_rub,
        code: 'CARD-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (insertErr) {
      throw new InternalServerErrorException(insertErr.message);
    }

    return { success: true, card: newPurchasedCard };
  }

  async getPurchasedCards(rawUserId: string) {
    try {
      // 1. Получаем истинный UUID пользователя
      const userId = await this.resolveUserId(rawUserId);

      // 2. Параллельно запрашиваем карты и сеты
      const [cardsRes, setsRes] = await Promise.all([
        this.supabase
          .from('user_cards')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        this.supabase
          .from('user_voucher_sets')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ]);

      if (cardsRes.error) console.error('🔥 Ошибка user_cards:', cardsRes.error);
      if (setsRes.error) console.error('🔥 Ошибка user_voucher_sets:', setsRes.error);

      // 3. Форматируем сеты ваучеров
      const sets = (setsRes.data || []).map((set) => ({
        ...set,
        type: 'set',
        title: set.title || 'Сет ваучеров',
        balance_rub: Number(set.balance_rub ?? set.total_nominal_rub ?? 0),
        price_rub: Number(set.price_rub ?? 0),
      }));

      // 4. Форматируем одиночные карты
      const cards = (cardsRes.data || []).map((card) => ({
        ...card,
        type: 'card',
        title: card.store_name || card.title || 'Подарочная карта',
        balance_rub: Number(card.balance_rub ?? 0),
        price_rub: Number(card.cost_price_rub ?? card.price_rub ?? 0),
      }));

      // 5. Выводим сначала все СЕТЫ, затем КАРТЫ
      return [...sets, ...cards];
    } catch (err) {
      console.error('🔥 CardsService Error:', err);
      throw new InternalServerErrorException('Ошибка при получении ваучеров');
    }
  }
}