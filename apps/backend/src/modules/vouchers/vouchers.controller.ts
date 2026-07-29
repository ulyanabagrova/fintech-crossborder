import { Controller, Get, Post, Body } from '@nestjs/common';
import { VouchersService } from './vouchers.service';

@Controller('api/v1/vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get('my-cards')
  getMyCards() {
    return this.vouchersService.getUserCards();
  }

  @Post('redeem')
  redeemCard(
    @Body() body: { cardId: string; rawQrData: string; amountCNY: number },
  ) {
    return this.vouchersService.redeemVoucher(body);
  }
}