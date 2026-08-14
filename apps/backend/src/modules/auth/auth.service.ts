import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(private readonly supabase: SupabaseClient) {}

  // 1. Авторизация по Email (для браузера)
  async loginWithEmail(email: string) {
    const cleanEmail = email.trim().toLowerCase();
    console.log(`📧 Авторизация по email: ${cleanEmail}`);

    let userToReturn = null;
    try {
      // Ищем пользователя в таблице users по email
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      userToReturn = existingUser;

      // Если пользователя нет — создаем его
      if (!userToReturn) {
        console.log('👤 Создаем нового юзера в таблице users по email...');
        const { data: createdUsers, error } = await this.supabase
          .from('users')
          .insert([
            { 
              email: cleanEmail,
              wechat_openid: null // openid не обязателен для браузера
            }
          ])
          .select();

        if (error) {
          console.error('Ошибка вставки юзера:', error);
          throw new InternalServerErrorException(error.message);
        }

        if (createdUsers && createdUsers.length > 0) {
          userToReturn = createdUsers[0];
        }
      }
    } catch (dbError) {
      console.error('🔥 Ошибка работы с Supabase (Email):', dbError);
      throw new InternalServerErrorException('Ошибка базы данных при авторизации');
    }

    const userId = userToReturn?.id || 'demo-user-uuid-12345';

    return {
      success: true,
      token: `mock_jwt_token_${userId}`,
      accessToken: `mock_jwt_token_${userId}`,
      user: userToReturn,
    };
  }

  // 2. Авторизация через WeChat (для мини-приложения)
  async loginWithWeChat(code: string) {
    const appId = process.env.WECHAT_APP_ID || '';
    const appSecret = process.env.WECHAT_APP_SECRET || '';

    let openid = 'demo_openid_default_user';

    const isMockEnv = appId.includes('mock') || appSecret.includes('mock') || code.includes('mock');

    if (!isMockEnv && appId && appSecret) {
      try {
        const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;
        const response = await axios.get(url);

        if (response.data && response.data.openid) {
          openid = response.data.openid;
        } else {
          console.warn('⚠️ WeChat API вернул ошибку, переходим на демо openid:', response.data);
        }
      } catch (error) {
        console.warn('⚠️ Ошибка сети при запросе к WeChat API, используем демо openid');
      }
    } else {
      console.log('🧪 Используется MOCK/Dev режим авторизации WeChat');
    }

    console.log(`🔑 Авторизация WeChat openid: ${openid}`);

    let userToReturn = null;
    try {
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('*')
        .eq('wechat_openid', openid)
        .maybeSingle();

      userToReturn = existingUser;

      if (!userToReturn) {
        console.log('👤 Вставляем нового юзера в таблицу users по WeChat...');
        const { data: createdUsers, error } = await this.supabase
          .from('users')
          .insert([{ wechat_openid: openid }])
          .select();

        if (error) {
          console.error('Ошибка вставки юзера WeChat:', error);
          throw new InternalServerErrorException(error.message);
        }

        if (createdUsers && createdUsers.length > 0) {
          userToReturn = createdUsers[0];
        }
      }
    } catch (dbError) {
      console.error('🔥 Ошибка работы с Supabase (WeChat):', dbError);
    }

    const userId = userToReturn?.id || 'demo-user-uuid-12345';

    return {
      success: true,
      token: `mock_jwt_token_${userId}`,
      accessToken: `mock_jwt_token_${userId}`,
      user: userToReturn,
    };
  }
}