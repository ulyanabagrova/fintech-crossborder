import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class CardsService {
  constructor(private readonly supabase: any) {} // Твой Supabase client

  // Логика покупки
  async buyCard(userId: string, cardId: string, type: string) {
    // 1. Находим карту/сет в общей базе (например, из таблицы voucher_cards)
    const { data: card, error: fetchErr } = await this.supabase
      .from(type === 'set' ? 'voucher_sets' : 'voucher_cards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (fetchErr || !card) {
      throw new InternalServerErrorException('Карта не найдена');
    }

    // 2. Создаем запись в таблице купленных карт пользователя user_cards
    const { data: newPurchasedCard, error: insertErr } = await this.supabase
      .from('user_cards')
      .insert({
        user_id: userId,
        voucher_id: card.id,
        title: card.store_name || card.title || 'Ваучер',
        balance_rub: card.balance_rub || card.total_price_rub,
        code: 'CARD-' + Math.random().toString(36).substring(2, 9).toUpperCase(), // Генерируем код
        status: 'ACTIVE'
      })
      .select()
      .single();

    if (insertErr) {
      throw new InternalServerErrorException(insertErr.message);
    }

    return { success: true, card: newPurchasedCard };
  }

  // Логика получения всех карт юзера
  async getPurchasedCards(userId: string) {
    const { data, error } = await this.supabase
      .from('user_cards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка Supabase:', error);
      return [];
    }

    return data || [];
  }
}