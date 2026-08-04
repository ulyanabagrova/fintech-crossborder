import { Module } from '@nestjs/common';
import { SbpController } from './sbp.controller';
import { SbpService } from './sbp.service';

@Module({
  controllers: [SbpController],
  providers: [SbpService],
  exports: [SbpService],
})
export class SbpModule {}