import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { User } from '@prisma/client';
import type { AppConfig } from '../../config/configuration.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EventLogService } from '../events/event-log.service.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly events: EventLogService,
  ) {}

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private async issueTokens(user: User, userAgent?: string): Promise<TokenPair> {
    const jwtCfg = this.config.get('jwt', { infer: true });
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
      { secret: jwtCfg.accessSecret, expiresIn: jwtCfg.accessTtl },
    );

    const refreshRaw = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshRaw),
        expiresAt: new Date(Date.now() + REFRESH_MS),
        userAgent: userAgent?.slice(0, 255) ?? null,
      },
    });
    return { accessToken, refreshToken: refreshRaw };
  }

  async login(email: string, password: string, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const ok = user && user.isActive && (await argon2.verify(user.passwordHash, password).catch(() => false));
    if (!ok || !user) {
      await this.events.log({ action: 'user.login_failed', payload: { email }, ipAddress: ip });
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Неверный email или пароль' });
    }
    await this.events.log({ action: 'user.login', actorId: user.id, ipAddress: ip });
    const tokens = await this.issueTokens(user, userAgent);
    return { ...tokens, user: this.publicUser(user) };
  }

  /** Ротация refresh при каждом обновлении (ТЗ 13.1). */
  async refresh(refreshRaw: string, userAgent?: string): Promise<TokenPair> {
    const hash = this.hashToken(refreshRaw);
    const token = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!token) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Сессия истекла' });

    await this.prisma.refreshToken.update({
      where: { id: token.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(token.user, userAgent);
  }

  async logout(refreshRaw: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(refreshRaw), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ok = await argon2.verify(user.passwordHash, oldPassword).catch(() => false);
    if (!ok) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Текущий пароль неверен' });
    if (newPassword.toLowerCase().includes(user.email.split('@')[0].toLowerCase())) {
      throw new UnauthorizedException({ code: 'VALIDATION_ERROR', message: 'Пароль не должен содержать email' });
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await argon2.hash(newPassword, { type: argon2.argon2id }) },
    });
    // Все прочие сессии — отозвать.
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  publicUser(user: User) {
    const { passwordHash: _omit, ...rest } = user;
    return rest;
  }
}
