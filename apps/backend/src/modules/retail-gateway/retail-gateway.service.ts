import { Injectable, BadRequestException } from '@nestjs/common';
import { VaultService } from '../security-vault/vault.service';
import { VouchersService } from '../vouchers/vouchers.service';

@Injectable()
export class RetailGatewayService {
  constructor(
    private readonly vaultService: VaultService,
    private readonly vouchersService: VouchersService,
  ) {}

  processClearing(cardId: string, rawQrData: string) {
    if (!rawQrData) {
      throw new BadRequestException('QR-код пуст');
    }

    // Парсим строку вида: FT_REDEEM|terminal_id|batch_id|AMOUNT|CURRENCY|sig
    const parts = rawQrData.split('|');
    const parsedAmount = parseFloat(parts[3]);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new BadRequestException('Некорректная сумма в QR-коде');
    }

    // Списываем именно распарсенную сумму!
    const redemptionResult = this.vouchersService.redeemVoucher({
      cardId,
      rawQrData,
      amountCNY: parsedAmount,
    });

    const clearingPayload = `${redemptionResult.transactionId}:${parsedAmount}:${cardId}`;
    const clearingSignature = this.vaultService.generateHmacSignature(clearingPayload);

    return {
      status: 'CLEARED',
      clearingBatchId: `batch_${Date.now()}`,
      signature: clearingSignature,
      details: redemptionResult,
    };
  }
}