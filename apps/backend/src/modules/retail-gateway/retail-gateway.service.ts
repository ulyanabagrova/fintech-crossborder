import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { VouchersService, UserCardRecord } from '../vouchers/vouchers.service';
import { VaultService } from '../security-vault/vault.service';

export interface TransactionRecord {
  id: string;
  type: 'SBP_PAYMENT' | 'VOUCHER_PURCHASE';
  merchantName: string;
  amountRUB: number;
  amountCNY: number;
  status: 'SUCCESS' | 'FAILED';
  signature: string;
  createdAt: string;
}

@Injectable()
export class RetailGatewayService {
  // Хранилище истории транзакций в памяти (до подключения PostgreSQL)
  private transactionsHistory: TransactionRecord[] = [];

  constructor(
    private readonly vouchersService: VouchersService,
    private readonly vaultService: VaultService,
  ) {}

  async processSbpPayment(qrPayload: string, userId: string, signature?: string) {
    const amountRUB = 450;
    const amountCNY = 55; // Эквивалент по курсу
    const merchantContext = this.extractMerchantContext(qrPayload);
    const merchantName = merchantContext.name;
    const merchantKey = merchantContext.key;

    // 1. Проверяем подпись входного запроса, если она передана
    if (signature) {
      const rawPayload = `${userId}:${amountRUB}:${qrPayload}`;
      const isValid = this.vaultService.verifyHmacSignature(rawPayload, signature);
      if (!isValid) {
        throw new UnauthorizedException('Security Vault: Подпись транзакции недействительна!');
      }
    }

    // 2. Получаем карты пользователя
    const userCards = await this.vouchersService.getUserCards(userId);

    // 3. Выбираем только активную карту для нужного магазина
    const eligibleCards = userCards.filter((card: UserCardRecord) => {
      const isStatusActive = card.status ? String(card.status).toUpperCase() === 'ACTIVE' : true;

      if (!merchantKey) {
        return isStatusActive;
      }

      return isStatusActive && this.matchesMerchant(card, merchantKey);
    });

    const activeCard = eligibleCards[0];

    if (!activeCard) {
      throw new BadRequestException(`Нет активной карты для магазина ${merchantName}`);
    }

    const currentBalance = Number(activeCard.balance_rub || 0);

    if (currentBalance < amountRUB) {
      throw new BadRequestException(
        `Недостаточно средств. Чек: ${amountRUB} ₽, Баланс: ${currentBalance} ₽`,
      );
    }

    // 4. Списываем средства
    const updatedBalance = currentBalance - amountRUB;
    activeCard.balance_rub = updatedBalance;

    await this.vouchersService.updateCardBalance(activeCard.id, updatedBalance);

    // 5. Подписываем результат через Vault
    const txId = `sbp-tx-${Date.now()}`;
    const payloadToSign = `${txId}:${amountRUB}:${activeCard.balance_rub}:${merchantName}`;
    const vaultSignature = this.vaultService.generateHmacSignature(payloadToSign);

    // 6. Сохраняем в историю
    const record: TransactionRecord = {
      id: txId,
      type: 'SBP_PAYMENT',
      merchantName,
      amountRUB,
      amountCNY,
      status: 'SUCCESS',
      signature: vaultSignature,
      createdAt: new Date().toISOString(),
    };

    this.transactionsHistory.unshift(record);

    return {
      success: true,
      transaction: record,
      remainingBalanceRUB: activeCard.balance_rub,
    };
  }

  private extractMerchantContext(qrPayload: string) {
    if (!qrPayload) {
      return { name: 'Тестовый мерчант СБП', key: '' };
    }

    const normalizedPayload = qrPayload.toLowerCase();

    if (normalizedPayload.includes('perekrestok') || normalizedPayload.includes('перекрёсток')) {
      return { name: 'Перекрёсток (Москва, ТЦ Цветной)', key: 'perekrestok' };
    }

    if (normalizedPayload.includes('auchan') || normalizedPayload.includes('ашан')) {
      return { name: 'Ашан (Москва, ТЦ Красная Площадь)', key: 'auchan' };
    }

    return { name: 'Тестовый мерчант СБП', key: '' };
  }

  private matchesMerchant(card: UserCardRecord, merchantKey: string): boolean {
    if (!card.store_name || !merchantKey) {
      return false;
    }

    const normalizedStore = String(card.store_name).toLowerCase();
    const normalizedKey = merchantKey.toLowerCase();

    return normalizedStore.includes(normalizedKey) || normalizedKey.includes(normalizedStore);
  }

  // Получить историю операций
  getHistory(userId: string) {
    return this.transactionsHistory;
  }
}