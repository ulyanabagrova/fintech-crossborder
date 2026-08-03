import { IsNotEmpty, IsString } from 'class-validator';

export class WechatLoginDto {
  @IsNotEmpty()
  @IsString()
  code!: string;
}