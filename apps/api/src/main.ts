import './load-env.js';
import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.setGlobalPrefix('api/v1');
  // Валидация входных данных — через ZodValidationPipe на каждом хендлере
  // (см. common/pipes/zod-validation.pipe.ts). Глобальный ValidationPipe из
  // @nestjs/common не используется: DTO не имеют class-validator-декораторов,
  // а его регистрация лишь роняла ERROR в лог о missing "class-validator".
  app.useGlobalFilters(new HttpExceptionFilter());

  app.use((req: Request & { requestId?: string }, res: Response, next: NextFunction) => {
    req.requestId = (req.headers['x-request-id'] as string) ?? randomUUID();
    res.setHeader('x-request-id', req.requestId);
    next();
  });

  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:1420';
  app.enableCors({ origin: corsOrigin.split(','), credentials: true });

  const swagger = new DocumentBuilder()
    .setTitle('Единое окно студента — API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('api/v1/docs', app, doc, { jsonDocumentUrl: 'api/v1/openapi.json' });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`API на http://localhost:${port}/api/v1  ·  Swagger: /api/v1/docs`, 'Bootstrap');
}

void bootstrap();
