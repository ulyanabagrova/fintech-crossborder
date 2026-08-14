// apps/backend/src/auth/dto/email-login.dto.ts
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class EmailLoginDto {
  @IsNotEmpty()
  @IsString()
  email!: string;
}