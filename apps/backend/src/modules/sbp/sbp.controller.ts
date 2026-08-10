import { Controller, Post, Body } from '@nestjs/common';
import { SbpService } from './sbp.service';
import { PayByQrDto } from './dto/pay-by-qr.dto';

@Controller('sbp') // 👈 Путь 1: /sbp
export class SbpController {
  constructor(private readonly sbpService: SbpService) {}

  @Post('pay-qr') // 👈 Путь 2: /pay-qr -> Итого /sbp/pay-qr
  async payByQr(@Body() dto: PayByQrDto) {
    return this.sbpService.payByQr(dto);
  }
}