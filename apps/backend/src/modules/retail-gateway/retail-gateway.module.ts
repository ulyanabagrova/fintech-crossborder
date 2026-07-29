import { Module } from '@nestjs/common';
import { RetailGatewayController } from './retail-gateway.controller';
import { RetailGatewayService } from './retail-gateway.service';
import { SecurityVaultModule } from '../security-vault/security-vault.module';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
  imports: [SecurityVaultModule, VouchersModule],
  controllers: [RetailGatewayController],
  providers: [RetailGatewayService],
})
export class RetailGatewayModule {}