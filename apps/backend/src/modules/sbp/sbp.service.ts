import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { PayByQrDto } from './dto/pay-by-qr.dto';

@Injectable()
export class SbpService {
  constructor(private readonly supabase: SupabaseClient) {}

  private async resolveUserId(userId: string): Promise<string> {
    const { data: user } = await this.supabase
      .from('users')
      .select('id')
      .or(`id.eq.${userId},telegram_id.eq.${userId}`)
      .maybeSingle();

    return user?.id || userId;
  }

  async payByQr(dto: PayByQrDto) {
    const {
      userId: rawUserId,
      store,
      amount,
      merchantId = 'SBP_MERCHANT_DEFAULT',
      idempotencyKey = crypto.randomUUID(),
    } = dto;

    if (amount <= 0) {
      throw new BadRequestException('Сумма оплаты должна быть больше 0');
    }

    const userId = await this.resolveUserId(rawUserId);

    // 1. Идемпотентность
    const { data: existingTx } = await this.supabase
      .from('transactions')
      .select('id, status, source_type, balance_before, balance_after')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingTx && existingTx.status === 'SUCCESS') {
      return {
        success: true,
        alreadyProcessed: true,
        paidFrom: existingTx.source_type === 'STORE_CARD' ? 'store_card' : 'voucher_set',
        deducted: amount,
        balanceBefore: Number(existingTx.balance_before),
        remainingBalance: Number(existingTx.balance_after),
        idempotencyKey,
      };
    }

    const cleanStore = store.trim().toLowerCase();

    // -------------------------------------------------------------
    // СЦЕНАРИЙ 1: Карта магазина (user_cards)
    // -------------------------------------------------------------
    const { data: userCards, error: cardErr } = await this.supabase
      .from('user_cards')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE');

    if (cardErr) {
      console.error('🔥 [Supabase Error] user_cards:', cardErr);
      throw new InternalServerErrorException(`Ошибка получения карт: ${cardErr.message}`);
    }

    const storeCard = (userCards || []).find((card) => {
      const cardTitle = (card.title || card.store_name || '').toLowerCase();
      const balance = Number(card.balance_rub ?? 0);
      const isStoreMatch = cardTitle.includes(cleanStore) || cleanStore.includes(cardTitle);
      return isStoreMatch && balance >= amount;
    });

    if (storeCard) {
      const balanceBefore = Number(storeCard.balance_rub ?? 0);
      const balanceAfter = balanceBefore - amount;
      const newStatus = balanceAfter === 0 ? 'USED' : 'ACTIVE';

      // Обновление БД
      const { error: updateErr } = await this.supabase
        .from('user_cards')
        .update({ balance_rub: balanceAfter, status: newStatus })
        .eq('id', storeCard.id);

      if (updateErr) {
        console.error('🔥 [Supabase Error] Update user_card:', updateErr);
        throw new InternalServerErrorException(`Ошибка списания с карты: ${updateErr.message}`);
      }

      await this.recordTransaction({
        idempotencyKey,
        userId,
        amountRub: amount,
        merchantId,
        status: 'SUCCESS',
        sourceType: 'STORE_CARD',
        sourceId: storeCard.id,
        balanceBefore,
        balanceAfter,
      });

      return {
        success: true,
        paidFrom: 'store_card',
        title: storeCard.title || storeCard.store_name || store,
        deducted: amount,
        balanceBefore,
        remainingBalance: balanceAfter,
        idempotencyKey,
      };
    }

    // -------------------------------------------------------------
    // СЦЕНАРИЙ 2: Сет ваучеров (user_voucher_sets)
    // -------------------------------------------------------------
    const { data: userSets, error: setErr } = await this.supabase
      .from('user_voucher_sets')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE');

    if (setErr) {
      console.error('🔥 [Supabase Error] user_voucher_sets:', setErr);
      throw new InternalServerErrorException(`Ошибка получения сетов: ${setErr.message}`);
    }

    const availableSet = (userSets || []).find((set) => {
      const currentBalance = set.balance_rub ?? set.total_nominal_rub ?? set.nominal_rub ?? set.nominal ?? 0;
      return Number(currentBalance) >= amount;
    });

    if (!availableSet) {
      throw new BadRequestException(
        `Недостаточно средств. У вас нет активной карты "${store}" или сета ваучеров с нужным балансом для оплаты ${amount} ₽.`,
      );
    }

    const rawBalance = availableSet.balance_rub ?? availableSet.total_nominal_rub ?? availableSet.nominal_rub ?? availableSet.nominal ?? 0;
    const setBalanceBefore = Number(rawBalance);
    const setBalanceAfter = setBalanceBefore - amount;
    const setStatus = setBalanceAfter === 0 ? 'USED' : 'ACTIVE';

    // Жесткое обновление базы Supabase
    const { error: setUpdateErr } = await this.supabase
      .from('user_voucher_sets')
      .update({ 
        balance_rub: setBalanceAfter, 
        status: setStatus 
      })
      .eq('id', availableSet.id);

    if (setUpdateErr) {
      console.error('🔥 [Supabase Error] Update user_voucher_sets:', setUpdateErr);
      throw new InternalServerErrorException(`Ошибка списания с сета ваучеров: ${setUpdateErr.message}`);
    }

    await this.recordTransaction({
      idempotencyKey,
      userId,
      amountRub: amount,
      merchantId,
      status: 'SUCCESS',
      sourceType: 'VOUCHER_SET',
      sourceId: availableSet.id,
      balanceBefore: setBalanceBefore,
      balanceAfter: setBalanceAfter,
    });

    return {
      success: true,
      paidFrom: 'voucher_set',
      title: availableSet.title || availableSet.name || 'Сет ваучеров',
      deducted: amount,
      balanceBefore: setBalanceBefore,
      remainingBalance: setBalanceAfter,
      idempotencyKey,
    };
  }

  private async recordTransaction(params: {
    idempotencyKey: string;
    userId: string;
    amountRub: number;
    merchantId: string;
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
    sourceType: 'STORE_CARD' | 'VOUCHER_SET';
    sourceId: string;
    balanceBefore: number;
    balanceAfter: number;
  }) {
    const { error } = await this.supabase.from('transactions').upsert(
      {
        idempotency_key: params.idempotencyKey,
        user_id: params.userId,
        amount_rub: params.amountRub,
        merchant_id: params.merchantId,
        status: params.status,
        source_type: params.sourceType,
        source_id: params.sourceId,
        balance_before: params.balanceBefore,
        balance_after: params.balanceAfter,
      },
      { onConflict: 'idempotency_key' },
    );

    if (error) {
      console.error('🔥 [Supabase Error] transactions record error:', error);
    }
  }
}