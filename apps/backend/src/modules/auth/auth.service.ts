import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(private readonly supabase: SupabaseClient) {}

  async loginWithWeChat(code: string) {
    const appId = process.env.WECHAT_APP_ID || 'demo_app_id';
    const appSecret = process.env.WECHAT_APP_SECRET || 'demo_secret';

    let openid: string;
    try {
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;
      const response = await axios.get(url);

      if (response.data && response.data.openid) {
        openid = response.data.openid;
      } else {
        // Зафиксируем постоянный openid для демо-режима вместо генерации случайных uuid
        openid = 'demo_openid_default_user';
      }
    } catch (error) {
      openid = 'demo_openid_default_user';
    }

    console.log(`🔑 Авторизация WeChat openid: ${openid}`);

    // 1. Ищем существующего пользователя
    const { data: existingUser, error: findError } = await this.supabase
      .from('users')
      .select('*')
      .eq('wechat_openid', openid)
      .maybeSingle();

    if (findError) {
      console.error('🔥 Ошибка поиска юзера:', findError);
    }

    if (existingUser) {
      console.log('✅ Найден существующий user.id:', existingUser.id);
      return {
        success: true,
        user: { id: existingUser.id, wechat_openid: existingUser.wechat_openid },
      };
    }

    // 2. Если пользователя нет — создаем его
    console.log('👤 Вставляем нового юзера в таблицу users...');
    const { data: createdUsers, error: createError } = await this.supabase
      .from('users')
      .insert([{ wechat_openid: openid }])
      .select();

    if (createError || !createdUsers || createdUsers.length === 0) {
      console.error('🔥 Не удалось создать юзера в Supabase:', createError);
      throw new InternalServerErrorException(
        `Ошибка сохранения пользователя в БД: ${createError?.message}`,
      );
    }

    const newUser = createdUsers[0];
    console.log('✅ Новый пользователь успешно зарегистрирован в БД. ID:', newUser.id);

    return {
      success: true,
      user: { id: newUser.id, wechat_openid: newUser.wechat_openid },
    };
  }
}