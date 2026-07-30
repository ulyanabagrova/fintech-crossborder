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
    const merchantName = this.extractMerchantName(qrPayload);

    // 1. Проверяем подпись входного запроса, если она передана
    if (signature) {
      const rawPayload = `${userId}:${amountRUB}:${qrPayload}`;
      const isValid = this.vaultService.verifyHmacSignature(rawPayload, signature);
      if (!isValid) {
        throw new UnauthorizedException('Security Vault: Подпись транзакции недействительна!');
      }
    }

    // 2. Проверяем баланс карт пользователя
    const userCards = this.vouchersService.getUserCards(userId);
    const activeCard = userCards.find((card) => card.status === 'ACTIVE');

    if (!activeCard) {
      throw new BadRequestException('Нет активных ваучеров для списания');
    }

    if (activeCard.balanceRUB < amountRUB) {
      throw new BadRequestException(`Недостаточно средств. Чек: ${amountRUB} ₽, Баланс: ${activeCard.balanceRUB} ₽`);
    }

    // 3. Списываем средства
    activeCard.balanceRUB -= amountRUB;

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

  private extractMerchantName(qrPayload: string) {
    if (!qrPayload) {
      return 'Тестовый мерчант СБП';
    }

    const normalizedPayload = qrPayload.toLowerCase();

    if (normalizedPayload.includes('perekrestok') || normalizedPayload.includes('перекрёсток')) {
      return 'Перекрёсток (Москва, ТЦ Цветной)';
    }

    if (normalizedPayload.includes('auchan') || normalizedPayload.includes('ашан')) {
      return 'Ашан (Москва, ТЦ Красная Площадь)';
    }

    return 'Тестовый мерчант СБП';
  }

  // Получить историю операций
  getHistory(userId: string) {
    return this.transactionsHistory;
  }
}