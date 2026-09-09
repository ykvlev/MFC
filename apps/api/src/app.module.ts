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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (raw) => buildConfig(validateEnv(raw)),
    }),
    // ТЗ 13.1: 100 запросов/мин по умолчанию; /auth/login ужесточается в AuthModule.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
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
    // Этап 8+: DocumentsModule, AbsencesModule, AnalyticsModule, JobsModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
