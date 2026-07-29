import { Module } from '@nestjs/common';
import { VouchersModule } from './modules/vouchers/vouchers.module';
import { SecurityVaultModule } from './modules/security-vault/security-vault.module';
import { RetailGatewayModule } from './modules/retail-gateway/retail-gateway.module';

@Module({
  imports: [
    VouchersModule,
    SecurityVaultModule,
    RetailGatewayModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}