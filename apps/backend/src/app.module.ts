// apps/backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // <-- Импортируем ConfigModule
import { SupabaseModule } from './database/supabase.module';
import { VouchersModule } from './modules/vouchers/vouchers.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { CardsModule } from './modules/cards/cards.module';
import { SbpModule } from './modules/sbp/sbp.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Делает .env доступным во всех модулях без повторного импорта
    }),
    SupabaseModule,
    VouchersModule,
    AuthModule,
    CartModule,
    CardsModule,
    SbpModule,
  ],
})
export class AppModule {}