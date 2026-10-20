import './common/bigint-serializer.js';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { buildConfig } from './config/configuration.js';
import { validateEnv } from './config/validation.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { EventsModule } from './modules/events/events.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { ApplicationTypesModule } from './modules/application-types/application-types.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { CellsModule } from './modules/cells/cells.module.js';
import { ApplicationsModule } from './modules/applications/applications.module.js';
import { FilesModule } from './modules/files/files.module.js';
import { BookingsModule } from './modules/bookings/bookings.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { AbsencesModule } from './modules/absences/absences.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { JobsModule } from './modules/jobs/jobs.module.js';
import { AnnouncementsModule } from './modules/announcements/announcements.module.js';
import { SlotsModule } from './modules/slots/slots.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // nest start запускается с cwd = apps/api, поэтому корневой .env монорепо
      // не подхватывается автоматически. Грузим его явно, с fallback на
      // локальный apps/api/.env, если он есть.
      envFilePath: ['../../.env', '.env'],
      validate: (raw) => buildConfig(validateEnv(raw)),
    }),
    // ТЗ 13.1: 100 запросов/мин по умолчанию; /auth/login ужесточается в AuthModule.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
      // Отключается только в интеграционных тестах (THROTTLE_DISABLED=1),
      // где общий 127.0.0.1 иначе исчерпывал бы лимит между сценариями.
      skipIf: () => process.env.THROTTLE_DISABLED === '1',
    }),
    PrismaModule,
    EventsModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ApplicationTypesModule,
    NotificationsModule,
    CellsModule,
    ApplicationsModule,
    FilesModule,
    BookingsModule,
    DocumentsModule,
    AbsencesModule,
    AnalyticsModule,
    JobsModule,
    // Расширения сверх ТЗ
    AnnouncementsModule,
    SlotsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
