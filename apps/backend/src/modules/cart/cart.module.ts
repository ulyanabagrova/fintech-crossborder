import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { SupabaseModule } from '../../database/supabase.module'; // <-- Вот правильный относительный путь!

@Module({
  imports: [
    SupabaseModule, // <-- Импортируем модуль базы данных
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}