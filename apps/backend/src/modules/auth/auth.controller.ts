import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { EmailLoginDto } from './dto/email-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: EmailLoginDto) {
    console.log('📥 Получен запрос на вход:', body.email);
    return this.authService.loginWithEmail(body.email);
  }

  @Post('wechat-login')
  async wechatLogin(@Body() dto: WechatLoginDto) {
    return this.authService.loginWithWeChat(dto.code);
  }
}