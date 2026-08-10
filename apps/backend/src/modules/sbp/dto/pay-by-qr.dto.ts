import { IsNotEmpty, IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class PayByQrDto {
  @IsNotEmpty({ message: 'userId обязателен' })
  @IsString()
  userId!: string;

  @IsNotEmpty({ message: 'store обязателен' })
  @IsString()
  store!: string;

  @IsNotEmpty({ message: 'amount обязателен' })
  @IsNumber({}, { message: 'amount должен быть числом' })
  @Min(1, { message: 'Сумма должна быть больше 0' })
  amount!: number;

  @IsOptional()
  @IsString()
  merchantId?: string;

  @IsOptional()
  @IsBoolean()
  allowStoreCard?: boolean;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}