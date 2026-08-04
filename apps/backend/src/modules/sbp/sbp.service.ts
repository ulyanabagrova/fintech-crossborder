import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SbpService {
  constructor(private readonly supabase: SupabaseClient) {}

  async payByQr(
    userId: string,
    store: string,
    amount: number,
    allowStoreCard: boolean = false, // Флаг: разрешено ли списание с карты магазина
  ) {
    // 1. Получаем все активные карты пользователя
    const { data: userCards, error: cardErr } = await this.supabase
      .from('user_cards')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE');

    if (cardErr) {
      console.error('Ошибка Supabase при получении карт:', cardErr);
      throw new InternalServerErrorException('Ошибка при получении карт пользователя');
    }

    if (!userCards || userCards.length === 0) {
      throw new BadRequestException('У вас нет активных карт для оплаты');
    }

    // 2. ИЩЕМ СЕТ ВАУЧЕРОВ (Первый приоритет)
    const setCard = userCards.find(
      (card) =>
        ((card.title && card.title.toLowerCase().includes('сет')) || card.is_set) &&
        Number(card.balance_rub) >= amount,
    );

    // Если есть сет с нужным балансом — сразу списываем
    if (setCard) {
      const newSetBalance = Number(setCard.balance_rub) - amount;
      const setStatus = newSetBalance === 0 ? 'USED' : 'ACTIVE';

      const { error: setUpdateErr } = await this.supabase
        .from('user_cards')
        .update({ balance_rub: newSetBalance, status: setStatus })
        .eq('id', setCard.id);

      if (setUpdateErr) {
        throw new InternalServerErrorException('Ошибка при списании средств с сета');
      }

      return {
        success: true,
        paidFrom: 'set_card',
        cardTitle: setCard.title,
        deducted: amount,
        remainingBalance: newSetBalance,
      };
    }

    // 3. ЕСЛИ НА СЕТАХ ДЕНЕГ НЕТ:
    // Ищем карту конкретного магазина (например, Nike)
    const storeCard = userCards.find(
      (card) =>
        card.title &&
        card.title.toLowerCase().includes(store.toLowerCase()) &&
        Number(card.balance_rub) >= amount,
    );

    // Если нет даже карты магазина с нужным балансом — сразу ошибка
    if (!storeCard) {
      throw new BadRequestException(
        `Недостаточно средств ни на сетах ваучеров, ни на карте магазина ${store}`,
      );
    }

    // Если пользователь ЕЩЁ НЕ ПОДТВЕРДИЛ списание с карты магазина:
    if (!allowStoreCard) {
      return {
        success: false,
        requireConfirmation: true,
        message: `Мы не обнаружили на ваших сетах денег. Предлагаем списать ${amount} ₽ с карты "${storeCard.title}".`,
        storeCardTitle: storeCard.title,
      };
    }

    // Если пользователь ПОДТВЕРДИЛ — списываем с карты магазина
    const newBalance = Number(storeCard.balance_rub) - amount;
    const status = newBalance === 0 ? 'USED' : 'ACTIVE';

    const { error: updateErr } = await this.supabase
      .from('user_cards')
      .update({ balance_rub: newBalance, status })
      .eq('id', storeCard.id);

    if (updateErr) {
      throw new InternalServerErrorException('Ошибка при списании с карты магазина');
    }

    return {
      success: true,
      paidFrom: 'store_card',
      cardTitle: storeCard.title,
      deducted: amount,
      remainingBalance: newBalance,
    };
  }
}