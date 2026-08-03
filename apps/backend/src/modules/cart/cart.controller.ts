import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
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

  @Delete(':cartItemId/:userId')
  async removeFromCart(
    @Param('cartItemId') cartItemId: string,
    @Param('userId') userId: string,
  ) {
    return this.cartService.removeFromCart(cartItemId, userId);
  }

  @Delete('clear/:userId')
  async clearCart(@Param('userId') userId: string) {
    return this.cartService.clearCart(userId);
  }
}