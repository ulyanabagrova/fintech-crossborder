import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DigitalGiftCard } from '@fintech/shared-types';

@Injectable()
export class VouchersService {
  private cards: DigitalGiftCard[] = [
    {
      id: 'card_888',
      maskedCardNumber: '**** **** **** 8888',
      currentCardValue: 500.0,
      currency: 'CNY',
      status: 'ACTIVE',
      expiryDate: '2027-12-31',
    },
  ];

  getUserCards(): DigitalGiftCard[] {
    return this.cards;
  }


  redeemVoucher(payload: { cardId: string; rawQrData: string; amountCNY: number }) {
    const card = this.cards.find((c) => c.id === payload.cardId);

    if (!card) {
      throw new NotFoundException('Карта не найдена');
    }

    if (card.status !== 'ACTIVE') {
      throw new BadRequestException('Карта неактивна');
    }

    if (card.currentCardValue < payload.amountCNY) {
      throw new BadRequestException('Недостаточно средств на балансе');
    }


    card.currentCardValue = Number((card.currentCardValue - payload.amountCNY).toFixed(2));

    const transactionId = `tx_${Date.now()}`;

    return {
      success: true,
      transactionId,
      remainingBalance: card.currentCardValue,
      deductedAmount: payload.amountCNY,
      currency: card.currency,
      timestamp: new Date().toISOString(),
    };
  }
}