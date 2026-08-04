import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { SbpService } from './sbp.service';

@Controller('sbp')
export class SbpController {
  constructor(private readonly sbpService: SbpService) {}

  @Post('pay-qr')
  async payByQr(
    @Body() body: { userId: string; store: string; amount: number; allowStoreCard?: boolean },
  ) {
    if (!body.userId || !body.store || !body.amount) {
      throw new BadRequestException('userId, store и amount обязательны');
    }
    return this.sbpService.payByQr(
      body.userId,
      body.store,
      body.amount,
      body.allowStoreCard || false,
    );
  }
}