import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // 1. Получить корзину пользователя
  @Get(':userId')
  async getUserCart(@Param('userId') userId: string) {
    return this.cartService.getUserCart(userId);
  }

  // 2. Добавить товар в корзину
  @Post('add')
  async addToCart(@Body() dto: AddToCartDto) {
    return this.cartService.addToCart(dto);
  }

  // 3. Оформление покупки (перенос карт из корзины в user_cards и очистка корзины)
  @Post('checkout')
  async checkout(@Body() body: { userId: string }) {
    if (!body?.userId) {
      throw new BadRequestException('userId обязателен для оформления заказа');
    }
    return this.cartService.checkout(body.userId);
  }

  // 4. Удалить один элемент из корзины по ID
  @Delete(':cartItemId/:userId')
  async removeFromCart(
    @Param('cartItemId') cartItemId: string,
    @Param('userId') userId: string,
  ) {
    return this.cartService.removeFromCart(cartItemId, userId);
  }

  // 5. Очистить всю корзину пользователя
  @Delete('clear/:userId')
  async clearCart(@Param('userId') userId: string) {
    return this.cartService.clearCart(userId);
  }
}