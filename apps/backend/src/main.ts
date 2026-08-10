import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Request, Response, NextFunction } from 'express';

let cachedServer: any;

async function bootstrapServer() {
  if (!cachedServer) {
    const app = await NestFactory.create(AppModule);

    // 1. Заголовки безопасности
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      next();
    });

    // 2. CORS
    app.enableCors({
      origin: true,
      credentials: true,
    });

    // 3. Главная страница (Root endpoint)
    const server = app.getHttpAdapter().getInstance();
    server.get('/', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        message: '🚀 Fintech Crossborder Backend is running!',
        apiDocs: '/api/v1',
      });
    });

    // 4. Глобальный префикс
    app.setGlobalPrefix('api/v1');

    // 5. Валидация DTO
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );

    await app.init();
    cachedServer = server;
  }
  return cachedServer;
}

// Экспорт для Vercel (Serverless Handler)
export default async function handler(req: any, res: any) {
  const server = await bootstrapServer();
  return server(req, res);
}

// Локальный запуск (npm run start:dev)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  bootstrapServer().then(() => {
    const port = process.env.PORT || 3000;
    // Используем созданный app для открытия порта локально
    NestFactory.create(AppModule).then(async (app) => {
      app.setGlobalPrefix('api/v1');
      await app.listen(port);
      console.log(`🚀 Local application is running on: http://localhost:${port}/api/v1`);
    });
  });
}