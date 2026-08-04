import { Module } from '@nestjs/common';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';

@Module({
  // SupabaseModule у тебя с декоратором @Global(),
  // поэтому его даже не нужно писать в imports!
  controllers: [CardsController],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule {}