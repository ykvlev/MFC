import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { AppModule } from '../../src/app.module.js';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter.js';

process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-xxxxxxxx';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-xxxxxxx';
process.env.S3_ENDPOINT ??= '';
process.env.S3_BUCKET ??= 'okno-files';
process.env.S3_ACCESS_KEY ??= 'x';
process.env.S3_SECRET_KEY ??= 'x';
process.env.SEED_ADMIN_PASSWORD ??= 'test-admin';

export const prisma = new PrismaClient();

export interface TestCtx {
  app: INestApplication;
  base: string;
  close: () => Promise<void>;
}

export async function createApp(): Promise<TestCtx> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0);
  const url = (await app.getUrl()).replace('[::1]', '127.0.0.1');
  return { app, base: `${url}/api/v1`, close: () => app.close() };
}

export async function resetDb(): Promise<void> {
  await prisma.eventLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.file.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.applicationStage.deleteMany();
  await prisma.application.deleteMany();
  await prisma.bookingPeriod.deleteMany();
  await prisma.cell.deleteMany();
  await prisma.routeStep.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.applicationType.deleteMany();
  await prisma.user.deleteMany();
}

type UserData = { email: string; role: 'STUDENT' | 'STAFF' | 'TEACHER' | 'ADMIN'; fullName?: string; department?: string; groupName?: string; course?: number; isBudget?: boolean };

export async function mkUser(data: UserData) {
  return prisma.user.create({
    data: {
      email: data.email,
      role: data.role,
      fullName: data.fullName ?? data.email,
      department: data.department ?? null,
      groupName: data.groupName ?? null,
      course: data.course ?? null,
      isBudget: data.isBudget ?? false,
      passwordHash: await argon2.hash('password123', { type: argon2.argon2id }),
    },
  });
}

export function client(base: string, token?: string) {
  return (path: string, init: RequestInit = {}) =>
    fetch(base + path, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
}

export async function login(base: string, email: string): Promise<string> {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123' }),
  });
  if (!res.ok) throw new Error(`login failed for ${email}: ${res.status}`);
  return ((await res.json()) as { accessToken: string }).accessToken;
}
