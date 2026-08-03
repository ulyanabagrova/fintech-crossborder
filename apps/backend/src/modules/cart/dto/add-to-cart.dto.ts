import { IsString, IsIn, IsNumber, IsOptional } from 'class-validator';

export class AddToCartDto {
  @IsString()
  userId!: string;

  @IsIn(['card', 'set'])
  itemType!: 'card' | 'set';

  @IsString()
  itemId!: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;
}