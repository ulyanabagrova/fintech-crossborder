import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

export interface UserCardRecord {
  id: string;
  user_id: string;
  store_name?: string;
  balance_rub: number;
  code?: string;
  status?: string;
  created_at?: string;
  [key: string]: any;
}

export interface VoucherCardRecord {
  id: string;
  category_id?: string;
  store_name: string;
  balance_rub: number;
  cost_price_rub: number;
  status?: string;
  set_id?: string | null;
  created_at?: string;
  [key: string]: any;
}

export interface VoucherSetRecord {
  id: string;
  title: string;
  total_balance_rub: number;
  total_nominal_rub: number;
  price_rub: number;
  status?: string;
  created_at?: string;
  voucher_cards?: VoucherCardRecord[];
  [key: string]: any;
}

@Injectable()
export class VouchersService {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * 1. Получение отдельных карт
   */
  async getAllCards(): Promise<VoucherCardRecord[]> {
    try {
      console.log('🔍 [getAllCards] Запрос карт из Supabase...');
      
      const { data: rawCards, error } = await this.supabase
        .from('voucher_cards')
        .select('*');

      if (error) {
        console.error('🔥 [getAllCards] Ошибка Supabase:', error);
        throw new InternalServerErrorException(`Ошибка БД: ${error.message}`);
      }

      console.log(`📦 [getAllCards] Найдено карт в БД: ${rawCards?.length || 0}`);

      if (!rawCards || rawCards.length === 0) {
        console.warn('⚠️ [getAllCards] Таблица voucher_cards пуста или сработал RLS!');
        return [];
      }

      return rawCards.map((card) => {
        const balance = Number(card.balance_rub ?? card.balanceRub ?? 0);
        const costPrice =
          card.cost_price_rub !== null && card.cost_price_rub !== undefined
            ? Number(card.cost_price_rub)
            : (card.costPriceRub !== undefined ? Number(card.costPriceRub) : balance);

        return {
          id: String(card.id),
          category_id: card.category_id || card.categoryId || null,
          store_name: card.store_name || card.storeName || 'Магазин',
          balance_rub: balance,
          cost_price_rub: costPrice,
          // Резервные дубли для фронтенда
          storeName: card.store_name || card.storeName || 'Магазин',
          balanceRub: balance,
          costPriceRub: costPrice,
          categoryId: card.category_id || card.categoryId || null,
          status: card.status || 'active',
          set_id: card.set_id || card.setId || null,
          setId: card.set_id || card.setId || null,
          created_at: card.created_at || card.createdAt,
          createdAt: card.created_at || card.createdAt,
        };
      });
    } catch (err) {
      console.error('🔥 VouchersService getAllCards Error:', err);
      return [];
    }
  }

  /**
   * 2. Получение сетов с картами
   */
  async getVoucherSets(): Promise<VoucherSetRecord[]> {
    try {
      console.log('🔍 [getVoucherSets] Запрос сетов...');
      const { data: rawSets, error: setsError } = await this.supabase
        .from('voucher_sets')
        .select('*');

      if (setsError) {
        console.error('🔥 [getVoucherSets] Ошибка Supabase:', setsError);
        throw new InternalServerErrorException(`Ошибка БД: ${setsError.message}`);
      }

      if (!rawSets || rawSets.length === 0) {
        console.warn('⚠️ [getVoucherSets] Таблица voucher_sets пуста');
        return [];
      }

      const { data: allCards, error: cardsError } = await this.supabase
        .from('voucher_cards')
        .select('*');

      if (cardsError) {
        console.error('🔥 Ошибка получения карт для сетов:', cardsError);
      }

      const cardsList = allCards || [];

      return rawSets.map((set) => {
        const setCards = cardsList
          .filter((card) => card.set_id && String(card.set_id) === String(set.id))
          .map((card) => {
            const b = Number(card.balance_rub ?? 0);
            const c =
              card.cost_price_rub !== null && card.cost_price_rub !== undefined
                ? Number(card.cost_price_rub)
                : b;

            return {
              id: String(card.id),
              category_id: card.category_id || null,
              store_name: card.store_name || card.storeName || 'Магазин',
              balance_rub: b,
              cost_price_rub: c,
              storeName: card.store_name || card.storeName || 'Магазин',
              balanceRub: b,
              costPriceRub: c,
              status: card.status || 'active',
              set_id: card.set_id,
              created_at: card.created_at,
            };
          });

        const sumCardsBalance = setCards.reduce((acc, item) => acc + item.balance_rub, 0);
        const sumCardsCost = setCards.reduce((acc, item) => acc + item.cost_price_rub, 0);

        const dbPrice =
          set.price_rub !== null && set.price_rub !== undefined ? Number(set.price_rub) : null;
        const finalPrice =
          dbPrice && dbPrice > 0 ? dbPrice : sumCardsCost > 0 ? sumCardsCost : sumCardsBalance;

        const dbBalance =
          set.total_balance_rub !== null && set.total_balance_rub !== undefined
            ? Number(set.total_balance_rub)
            : null;
        const dbNominal =
          set.total_nominal_rub !== null && set.total_nominal_rub !== undefined
            ? Number(set.total_nominal_rub)
            : null;

        const finalTotalBalance =
          dbBalance && dbBalance > 0
            ? dbBalance
            : dbNominal && dbNominal > 0
            ? dbNominal
            : sumCardsBalance;

        const finalTotalNominal = dbNominal && dbNominal > 0 ? dbNominal : finalTotalBalance;

        return {
          id: String(set.id),
          title: set.title || 'Сет ваучеров',
          price_rub: finalPrice,
          total_balance_rub: finalTotalBalance,
          total_nominal_rub: finalTotalNominal,
          priceRub: finalPrice,
          totalBalanceRub: finalTotalBalance,
          totalNominalRub: finalTotalNominal,
          status: set.status || 'active',
          created_at: set.created_at,
          createdAt: set.created_at,
          voucher_cards: setCards,
          cards: setCards,
        };
      });
    } catch (err) {
      console.error('🔥 VouchersService getVoucherSets Error:', err);
      return [];
    }
  }

  /**
   * 3. Карты пользователя
   */
  async getUserCards(userId: string): Promise<UserCardRecord[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_cards')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('🔥 Ошибка Supabase user_cards:', error);
        throw error;
      }

      return (data || []).map((card) => {
        const bal = Number(card.balance_rub ?? card.balanceRub ?? 0);
        return {
          ...card,
          balance_rub: bal,
          balanceRub: bal,
        };
      });
    } catch (err) {
      console.error('🔥 VouchersService getUserCards Error:', err);
      return [];
    }
  }

  /**
   * 4. Генерация динамических сетов
   */
  async generateSet() {
    try {
      const { data, error } = await this.supabase.rpc('generate_dynamic_voucher_sets');
      if (error) throw new InternalServerErrorException(error.message);
      return { success: true, result: data };
    } catch (err) {
      console.error('🔥 VouchersService generateSet Error:', err);
      return { success: false, message: 'Ошибка генерации' };
    }
  }

  /**
   * 5. Обновление баланса карты пользователя
   */
  async updateCardBalance(cardId: string, newBalance: number): Promise<UserCardRecord> {
    try {
      const { data, error } = await this.supabase
        .from('user_cards')
        .update({ balance_rub: newBalance })
        .eq('id', cardId)
        .select()
        .maybeSingle();

      if (error || !data) {
        throw new NotFoundException(`Не удалось обновить карту ${cardId}`);
      }

      return data;
    } catch (err) {
      console.error('🔥 VouchersService updateCardBalance Error:', err);
      throw err;
    }
  }
}