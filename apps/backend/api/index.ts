import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

let app: any;

export default async function handler(req: any, res: any) {
  if (!app) {
    app = await NestFactory.create(AppModule);

    app.enableCors({
      origin: true,
      credentials: true,
    });

    // Возвращаем префикс
    app.setGlobalPrefix('api/v1');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
  }

  // Для Serverless на Vercel фиксируем req.url, если rewrite передает его со сдвигом
  if (req.url && !req.url.startsWith('/api/v1')) {
    req.url = `/api/v1${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  const instance = app.getHttpAdapter().getInstance();
  return instance(req, res);
}