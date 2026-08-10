// apps/backend/api/index.ts
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

    // ⚠️ УБРАНО: app.setGlobalPrefix('api/v1');
    // На Vercel маршрутизация решает префикс, либо он обрабатывается на уровне rewrites.

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
  }

  const instance = app.getHttpAdapter().getInstance();
  return instance(req, res);
}