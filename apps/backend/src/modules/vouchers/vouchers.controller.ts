import { Controller, Get, Query, Param, Patch, Body } from '@nestjs/common';
import { VouchersService } from './vouchers.service';

@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  // GET /api/v1/vouchers/sets
  @Get('sets')
  async getVoucherSets() {
    return this.vouchersService.getVoucherSets();
  }

  // GET /api/v1/vouchers/cards  <-- ИМЕННО ЭТОТ РУТ ИЩЕТ WECHAT
  @Get('cards')
  async getAllCards() {
    return this.vouchersService.getAllCards();
  }

  // GET /api/v1/vouchers/user/:userId
  @Get('user/:userId')
  async getUserCards(
    @Param('userId') userId: string,
    @Query('merchantKey') merchantKey?: string,
  ) {
    return this.vouchersService.getUserCards(userId, merchantKey);
  }
}