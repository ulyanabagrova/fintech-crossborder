import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Устанавливаем заголовки безопасности (включая Cross-Origin Isolation для SharedArrayBuffer)
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
  });

  // 2. Разрешаем CORS-запросы для фронтенда
  app.enableCors({
    origin: true, // Разрешает запросы с любых источников (можно указать конкретный домен)
    credentials: true,
  });

  // 3. Обрабатываем корень сайта (/) ДО установки префикса api/v1
  const server = app.getHttpAdapter().getInstance();
  server.get('/', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      message: '🚀 Fintech Crossborder Backend is running!',
      apiDocs: '/api/v1',
    });
  });

  // 4. Устанавливаем глобальный префикс для всех остальных API-эндпоинтов
  app.setGlobalPrefix('api/v1');

  // 5. Включаем глобальную валидацию и авто-преобразование типов DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Удаляет из запроса поля, которых нет в DTO
      forbidNonWhitelisted: false, // Не выбрасывает ошибку на лишние поля, просто отбрасывает их
      transform: true, // Автоматически приводит JSON-типы к типам, указанным в DTO (например, "100" -> 100)
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
}

bootstrap();