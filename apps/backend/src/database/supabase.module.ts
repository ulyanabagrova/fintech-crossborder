import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import * as WebSocket from 'ws';

// 1. Полифил WebSocket для Node.js < 22
if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as any).WebSocket = WebSocket;
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SupabaseClient,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const supabaseUrl = configService.get<string>('SUPABASE_URL') || '';
        const supabaseKey =
          configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
          configService.get<string>('SUPABASE_KEY') ||
          '';

        if (!supabaseUrl || !supabaseKey) {
          console.error(
            '🔥 [SupabaseModule] Отсутствует SUPABASE_URL или SUPABASE_KEY в .env!',
          );
        }

        return createClient(supabaseUrl, supabaseKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          // 2. Явно передаем транспорт WebSocket для надежности
          realtime: {
            transport: WebSocket as any,
          },
        });
      },
    },
  ],
  exports: [SupabaseClient],
})
export class SupabaseModule {}