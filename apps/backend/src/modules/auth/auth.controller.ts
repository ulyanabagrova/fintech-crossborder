import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { WechatLoginDto } from './dto/wechat-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('wechat-login')
  async wechatLogin(@Body() dto: WechatLoginDto) {
    return this.authService.loginWithWeChat(dto.code);
  }
}