import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class VouchersService {
  constructor(private readonly supabase: SupabaseClient) {}

  // 1. Получение активных сетов (со вложенными картами без конфликтов Foreign Key)
  async getVoucherSets() {
    try {
      // Шаг A: Получаем список активных сетов
      const { data: sets, error: setsError } = await this.supabase
        .from('voucher_sets')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (setsError) {
        console.error('🔥 Ошибка Supabase при получении voucher_sets:', setsError);
        throw new InternalServerErrorException(`Ошибка БД: ${setsError.message}`);
      }

      if (!sets || sets.length === 0) {
        return [];
      }

      // Шаг B: Забираем карты, привязанные к этим сетам
      const setIds = sets.map((s) => s.id);
      const { data: cards, error: cardsError } = await this.supabase
        .from('voucher_cards')
        .select('id, store_name, balance_rub, set_id')
        .in('set_id', setIds);

      if (cardsError) {
        console.error('🔥 Ошибка при получении карт для сетов:', cardsError);
      }

      // Шаг C: Группируем карты внутрь соответствующих сетов
      const setsWithCards = sets.map((set) => ({
        ...set,
        voucher_cards: (cards || []).filter((card) => card.set_id === set.id),
      }));

      return setsWithCards;
    } catch (err) {
      console.error('🔥 VouchersService getVoucherSets Error:', err);
      throw err;
    }
  }

  // 2. Получение всех отдельных карт (Каталог карт под сетами)
  async getAllCards() {
    try {
      const { data, error } = await this.supabase
        .from('voucher_cards')
        .select(`
          id,
          store_name,
          balance_rub,
          status,
          created_at,
          voucher_categories (
            id,
            name,
            slug
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('🔥 Ошибка Supabase при получении voucher_cards:', error);
        throw new InternalServerErrorException(`Ошибка БД: ${error.message}`);
      }

      return data || [];
    } catch (err) {
      console.error('🔥 VouchersService getAllCards Error:', err);
      return [];
    }
  }

  // 3. Вызов генерации случайного сета в Supabase
  async generateSet(categorySlug: string, maxBudgetRub: number) {
    try {
      const { data, error } = await this.supabase.rpc('generate_random_voucher_set', {
        target_category_slug: categorySlug,
        max_budget_rub: maxBudgetRub,
        cny_rate: 10.0,
      });

      if (error) {
        console.error('🔥 Ошибка RPC generate_random_voucher_set:', error);
        throw new InternalServerErrorException(error.message);
      }

      return { success: true, setId: data };
    } catch (err) {
      console.error('🔥 VouchersService generateSet Error:', err);
      throw err;
    }
  }

  // 4. Получение карт конкретного пользователя
  async getUserCards(userId: string, merchantKey?: string) {
    try {
      let query = this.supabase
        .from('user_vouchers')
        .select('*')
        .eq('user_id', userId);

      if (merchantKey) {
        query = query.eq('merchant_key', merchantKey);
      }

      const { data, error } = await query;

      if (error) {
        console.error('🔥 Ошибка Supabase при получении user_vouchers:', error);
        throw error;
      }

      return data || [];
    } catch (err) {
      console.error('🔥 VouchersService getUserCards Error:', err);
      return [];
    }
  }

  // 5. Обновление баланса карты
  async updateCardBalance(cardId: string, newBalance: number) {
    try {
      const { data, error } = await this.supabase
        .from('user_vouchers')
        .update({ balance: newBalance })
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