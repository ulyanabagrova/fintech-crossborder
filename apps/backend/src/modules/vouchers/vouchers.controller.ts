import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Param, 
  Body, 
  HttpCode, 
  HttpStatus 
} from '@nestjs/common';
import { VouchersService } from './vouchers.service';

@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get('sets')
  async getVoucherSets() {
    return this.vouchersService.getVoucherSets();
  }

  @Get('cards')
  async getAllCards() {
    return this.vouchersService.getAllCards();
  }

  @Get('user/:userId')
  async getUserCards(@Param('userId') userId: string) {
    return this.vouchersService.getUserCards(userId);
  }

  @Post('generate-sets')
  @HttpCode(HttpStatus.OK)
  async generateSets() {
    return this.vouchersService.generateSet();
  }

  @Patch('user-card/:cardId/balance')
  async updateCardBalance(
    @Param('cardId') cardId: string,
    @Body('newBalance') newBalance: number,
  ) {
    return this.vouchersService.updateCardBalance(cardId, newBalance);
  }
}