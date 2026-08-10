import { Module } from '@nestjs/common';
import { SbpController } from './sbp.controller';
import { SbpService } from './sbp.service';
import { SupabaseClient } from '@supabase/supabase-js';

@Module({
  controllers: [SbpController],
  providers: [
    SbpService,
    {
      provide: SupabaseClient,
      useFactory: () => {
        const url = process.env.SUPABASE_URL || '';
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
        return new SupabaseClient(url, key);
      },
    },
  ],
  exports: [SbpService],
})
export class SbpModule {}