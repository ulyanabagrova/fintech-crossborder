import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Request, Response } from 'express';

let cachedServer: any;

async function bootstrapServer() {
  if (!cachedServer) {
    const app = await NestFactory.create(AppModule);

    // 1. CORS — разрешаем запросы отовсюду (включая WeChat DevTools и iOS/Android WebView)
    app.enableCors({
      origin: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
      allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
    });

    // 2. Глобальный префикс API
    app.setGlobalPrefix('api/v1');

    // 3. Валидация DTO
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );

    // 4. Главная страница (Root endpoint вне префикса api/v1)
    const server = app.getHttpAdapter().getInstance();
    server.get('/', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        message: '🚀 Fintech Crossborder Backend is running!',
        apiDocs: '/api/v1',
      });
    });

    await app.init();
    cachedServer = server;
  }
  return cachedServer;
}

// Экспорт для Vercel Serverless Function
export default async function handler(req: any, res: any) {
  const server = await bootstrapServer();
  return server(req, res);
}

// Локальный запуск
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  bootstrapServer().then(async () => {
    const port = process.env.PORT || 3000;
    const app = await NestFactory.create(AppModule);
    app.enableCors({ origin: true, credentials: true });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(port);
    console.log(`🚀 Local application is running on: http://localhost:${port}/api/v1`);
  });
}