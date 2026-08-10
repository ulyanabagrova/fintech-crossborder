import { Controller, Get, Post, Body, Query, BadRequestException } from '@nestjs/common';
import { CardsService } from './cards.service';

@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  // POST /api/v1/cards/buy
  @Post('buy')
  async buyCard(@Body() body: { userId: string; cardId: string; type: string }) {
    if (!body.userId || !body.cardId) {
      throw new BadRequestException('userId и cardId обязательны');
    }
    return this.cardsService.buyCard(body.userId, body.cardId, body.type);
  }

  // GET /api/v1/cards/purchased?userId=...
  @Get('purchased')
  async getPurchasedCards(@Query('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId обязателен');
    }
    return this.cardsService.getPurchasedCards(userId);
  }
}