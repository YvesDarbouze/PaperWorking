import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    rawBody: true,
  });

  app.use(cookieParser());

  const origins = (
    process.env.CORS_ORIGINS ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature'],
  });

  const port = Number(process.env.PORT || 8080);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[paperworking-api] Nest listening on 0.0.0.0:${port}`);
}

void bootstrap();
