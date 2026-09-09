import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';

/**
 * TZ-GAP (план п.6): канал PUSH.
 * MVP-заглушка: находит токены устройств пользователя и логирует отправку.
 * Реальная интеграция APNs (`node-apn`/HTTP2) и FCM (`firebase-admin`)
 * подключается здесь; ключи — из окружения (APNS_*, FCM_SERVICE_ACCOUNT_JSON).
 * Падение канала не должно ломать бизнес-транзакцию (ТЗ 10).
 */
@Injectable()
export class PushChannel {
  private readonly logger = new Logger(PushChannel.name);

  constructor(private readonly prisma: PrismaService) {}

  async send(userId: string, title: string, body: string): Promise<void> {
    try {
      const tokens = await this.prisma.deviceToken.findMany({ where: { userId } });
      if (tokens.length === 0) return;
      for (const t of tokens) {
        this.logger.debug(`push[${t.platform}] -> ${t.token.slice(0, 12)}…: ${title}`);
        // TODO(этап 10): apnsProvider.send(...) / firebaseMessaging.send(...)
      }
    } catch (e) {
      this.logger.warn(`push не отправлен: ${(e as Error).message}`);
    }
  }

  async register(userId: string, platform: 'IOS' | 'ANDROID', token: string): Promise<void> {
    await this.prisma.deviceToken.upsert({
      where: { token },
      update: { userId, platform, lastSeenAt: new Date() },
      create: { userId, platform, token },
    });
  }

  async unregister(token: string): Promise<void> {
    await this.prisma.deviceToken.deleteMany({ where: { token } });
  }
}
