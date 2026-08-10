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

  @Get(':userId')
  async getUserCart(@Param('userId') userId: string) {
    return this.cartService.getUserCart(userId);
  }

  @Post('add')
  async addToCart(@Body() dto: AddToCartDto) {
    return this.cartService.addToCart(dto);
  }

  @Post('checkout')
  async checkout(@Body() body: { userId: string }) {
    if (!body?.userId) {
      throw new BadRequestException('userId обязателен для оформления заказа');
    }
    return this.cartService.checkout(body.userId);
  }

  // Статичный маршрут с явным префиксом 'clear' должен стоять выше параметризованного ':cartItemId/:userId'
  @Delete('clear/:userId')
  async clearCart(@Param('userId') userId: string) {
    return this.cartService.clearCart(userId);
  }

  @Delete(':cartItemId/:userId')
  async removeFromCart(
    @Param('cartItemId') cartItemId: string,
    @Param('userId') userId: string,
  ) {
    return this.cartService.removeFromCart(cartItemId, userId);
  }
}