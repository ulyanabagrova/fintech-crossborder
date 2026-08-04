import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHome() {
    return {
      status: 'ok',
      message: '🚀 Fintech Crossborder Backend is running!',
      timestamp: new Date().toISOString(),
    };
  }
}