// apps/backend/src/modules/retail-gateway/retail-gateway.service.ts
import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { VouchersService } from '../vouchers/vouchers.service';
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

    // 2. Проверяем баланс карт пользователя и выбираем только карту нужного магазина
    const userCards = await this.vouchersService.getUserCards(userId, merchantKey);
    const eligibleCards = userCards.filter((card) => {
      if (!merchantKey) {
        return String(card.status).toUpperCase() === 'ACTIVE';
      }

      return String(card.status).toUpperCase() === 'ACTIVE' && this.matchesMerchant(card, merchantKey);
    });
    const activeCard = eligibleCards[0];

    if (!activeCard) {
      throw new BadRequestException(`Нет активной карты для магазина ${merchantName}`);
    }

    if (activeCard.balanceRUB < amountRUB) {
      throw new BadRequestException(`Недостаточно средств. Чек: ${amountRUB} ₽, Баланс: ${activeCard.balanceRUB} ₽`);
    }

    // 3. Списываем средства
    const updatedBalance = activeCard.balanceRUB - amountRUB;
    activeCard.balanceRUB = updatedBalance;

    await this.vouchersService.updateCardBalance(activeCard.id, updatedBalance);

    // 4. Подписываем результат через Vault
    const txId = `sbp-tx-${Date.now()}`;
    const payloadToSign = `${txId}:${amountRUB}:${activeCard.balanceRUB}:${merchantName}`;
    const vaultSignature = this.vaultService.generateHmacSignature(payloadToSign);

    // 5. Сохраняем в историю
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
      remainingBalanceRUB: activeCard.balanceRUB,
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

  private matchesMerchant(card: { merchantId?: string }, merchantKey: string) {
    if (!card.merchantId || !merchantKey) {
      return false;
    }

    const normalizedCard = String(card.merchantId).toLowerCase();
    const normalizedKey = merchantKey.toLowerCase();

    return normalizedCard.includes(normalizedKey) || normalizedKey.includes(normalizedCard);
  }

  // Получить историю операций
  getHistory(userId: string) {
    return this.transactionsHistory;
  }
}