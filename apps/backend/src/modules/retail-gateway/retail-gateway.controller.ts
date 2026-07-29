import { Controller, Post, Body } from '@nestjs/common';
import { RetailGatewayService } from './retail-gateway.service';

@Controller('api/v1/clearing')
export class RetailGatewayController {
  constructor(private readonly retailGatewayService: RetailGatewayService) {}

  @Post('process')
  processTransaction(
    @Body() body: { cardId: string; rawQrData: string; amountCNY: number },
  ) {
    return this.retailGatewayService.processClearing(
      body.cardId,
      body.rawQrData,
      body.amountCNY,
    );
  }
}