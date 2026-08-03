import { Module } from '@nestjs/common';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';
import { AuthModule } from '../auth/auth.module'; // Импортируем AuthModule, который предоставляет SupabaseClient

@Module({
  imports: [AuthModule],
  controllers: [VouchersController],
  providers: [VouchersService],
  exports: [VouchersService],
})
export class VouchersModule {}