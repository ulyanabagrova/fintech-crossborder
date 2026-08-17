import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class EmailLoginDto {
  @IsNotEmpty()
  @IsString()
  email!: string;
}