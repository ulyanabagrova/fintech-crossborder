import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from '../src/app.module';

const server = express();

const createNestServer = async (expressInstance: any) => {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.init();
};

let isInitialized = false;

export default async function handler(req: any, res: any) {
  console.log(`[Vercel Raw Incoming Request]: ${req.method} ${req.url}`);

  // Если Vercel срезает /api/v1, восстанавливаем полный путь для NestJS
  if (req.url && !req.url.startsWith('/api/v1')) {
    const originalUrl = req.url;
    if (req.url.startsWith('/v1')) {
      req.url = `/api${req.url}`;
    } else {
      req.url = `/api/v1${req.url.startsWith('/') ? '' : '/'}${req.url}`;
    }
    console.log(`[URL Rewritten]: ${originalUrl} -> ${req.url}`);
  }

  if (!isInitialized) {
    await createNestServer(server);
    isInitialized = true;
  }
  server(req, res);
}