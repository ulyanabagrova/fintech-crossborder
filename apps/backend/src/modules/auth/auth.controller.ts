import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth') // Это добавляет /auth к пути
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login') // Это добавляет /login к пути
  async login(@Body() body: { email: string }) {
    console.log('📥 Получен запрос на вход:', body.email); // Проверь лог в терминале!
    return this.authService.loginWithEmail(body.email);
  }

  @Post('wechat-login')
  async wechatLogin(@Body() dto: any) {
    return this.authService.loginWithWeChat(dto.code);
  }
}