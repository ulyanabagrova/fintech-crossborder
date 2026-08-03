// apps/backend/src/database/supabase.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private client!: SupabaseClient;

  onModuleInit() {
    let url = process.env.SUPABASE_URL || '';
    const projectId = process.env.SUPABASE_PROJECT_ID;

    const key =
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      '';

    if (projectId && !url) {
      url = `https://${projectId.trim()}.supabase.co`;
    }

    if (!url || !key) {
      console.error('❌ Ошибка: SUPABASE_URL и SUPABASE_KEY не найдены в .env!');
      return;
    }

    // Передаем WebSocket из пакета 'ws' с приведенным типом
    this.client = createClient(url, key, {
      auth: { persistSession: false },
      realtime: {
        transport: WebSocket as any,
      },
    });

    console.log(`⚡ Supabase Client успешно подключен к: ${url}`);
  }

  get getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase client is not initialized. Check your .env variables.');
    }
    return this.client;
  }
}