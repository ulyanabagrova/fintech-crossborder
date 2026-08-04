import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Разрешаем CORS-запросы (нужно для подключения фронтенда)
  app.enableCors();

  // Обрабатываем самый корень сайта (/) ДО установки префикса api/v1
  const server = app.getHttpAdapter().getInstance();
  server.get('/', (req, res) => {
    res.json({
      status: 'ok',
      message: '🚀 Fintech Crossborder Backend is running!',
      apiDocs: '/api/v1',
    });
  });

  // Устанавливаем глобальный префикс для всех остальных контроллеров
  app.setGlobalPrefix('api/v1');

  // Включаем глобальную валидацию входных данных
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  await app.listen(process.env.PORT || 3000);
}
bootstrap();