import { Controller, Get, Post, Body } from '@nestjs/common';
import { VouchersService } from './vouchers.service';

@Controller('api/v1/vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get('catalog')
  getCatalog() {
    return this.vouchersService.getCatalog();
  }

  @Get('my-cards')
  getMyCards() {
    return this.vouchersService.getUserCards('user-demo-1');
  }

  @Post('buy')
  buyVoucher(@Body() body: { templateId: string }) {
    return this.vouchersService.buyVoucher(body.templateId);
  }
}