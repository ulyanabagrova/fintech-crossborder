import { Body, Controller, Get, Post } from '@nestjs/common';
import { RetailGatewayService } from './retail-gateway.service';

@Controller('api/v1/sbp')
export class RetailGatewayController {
  constructor(private readonly retailGatewayService: RetailGatewayService) {}

  @Post('pay')
  async payViaSbp(@Body() body: { qrData: string; signature?: string; userId?: string }) {
    const userId = body.userId ?? 'user-demo-1';
    return this.retailGatewayService.processSbpPayment(body.qrData, userId, body.signature);
  }

  @Get('history')
  async getHistory() {
    return this.retailGatewayService.getHistory('user-demo-1');
  }
}