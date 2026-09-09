import { createHash, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Application, FileKind } from '@prisma/client';
import type { AppConfig } from '../../config/configuration.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EventLogService } from '../events/event-log.service.js';
import { detectedMime, isSupportedExt, matchesExtension, normalizeExt } from './magic-bytes.js';
import { STORAGE_DRIVER, type StorageDriver } from './storage/storage.interface.js';

export interface UploadInput {
  buffer: Buffer;
  originalName: string;
  kind: FileKind;
  fieldKey?: string;
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly events: EventLogService,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
  ) {}

  async upload(app: Application, user: AuthUser, input: UploadInput) {
    const maxBytes = this.config.get('maxFileSizeMb', { infer: true }) * 1024 * 1024;
    if (input.buffer.length > maxBytes) {
      throw new PayloadTooLargeException({ code: 'FILE_TOO_LARGE', message: 'Файл превышает допустимый размер' });
    }

    const ext = normalizeExt(input.originalName.split('.').pop() ?? '');
    if (!isSupportedExt(ext)) {
      throw new UnsupportedMediaTypeException({ code: 'UNSUPPORTED_FILE_TYPE', message: 'Неподдерживаемый тип файла' });
    }
    if (!matchesExtension(input.buffer, ext)) {
      throw new UnsupportedMediaTypeException({
        code: 'UNSUPPORTED_FILE_TYPE',
        message: 'Содержимое файла не соответствует расширению',
      });
    }

    // Студент кладёт вложения только в свою заявку в редактируемом статусе (ТЗ 12).
    if (user.role === 'STUDENT') {
      if (app.userId !== user.id) {
        throw new ForbiddenException({ code: 'ACCESS_DENIED', message: 'Нет доступа к заявке' });
      }
      const editable: Application['status'][] = ['DRAFT', 'NEEDS_FIX', 'AWAITING_SIGNATURE'];
      if (!editable.includes(app.status)) {
        throw new BadRequestException({ code: 'INVALID_TRANSITION', message: 'В этом статусе файлы не загружаются' });
      }
    }

    const storageKey = `${app.id}/${randomUUID()}.${ext}`;
    const mimeType = detectedMime(ext);
    await this.storage.put(storageKey, input.buffer, mimeType);

    const file = await this.prisma.file.create({
      data: {
        applicationId: app.id,
        uploadedById: user.id,
        kind: input.kind,
        fieldKey: input.fieldKey ?? null,
        originalName: input.originalName.slice(0, 255),
        storageKey,
        mimeType,
        sizeBytes: BigInt(input.buffer.length),
        checksumSha256: createHash('sha256').update(input.buffer).digest('hex'),
      },
    });

    if (input.kind === 'SIGNED_SCAN') {
      await this.events.log({ action: 'application.signed_uploaded', applicationId: app.id, actorId: user.id });
    }
    return { ...file, sizeBytes: Number(file.sizeBytes) };
  }

  async getForDownload(app: Application, fileId: string) {
    const file = await this.prisma.file.findFirst({ where: { id: fileId, applicationId: app.id } });
    if (!file) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Файл не найден' });
    const stream = await this.storage.get(file.storageKey);
    return { file, stream };
  }

  async remove(app: Application, fileId: string, user: AuthUser): Promise<void> {
    const file = await this.prisma.file.findFirst({ where: { id: fileId, applicationId: app.id } });
    if (!file) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Файл не найден' });
    if (file.uploadedById !== user.id || !['DRAFT', 'NEEDS_FIX'].includes(app.status)) {
      throw new ForbiddenException({ code: 'ACCESS_DENIED', message: 'Файл удалить нельзя' });
    }
    await this.storage.delete(file.storageKey);
    await this.prisma.file.delete({ where: { id: file.id } });
  }

  list(appId: string) {
    return this.prisma.file.findMany({ where: { applicationId: appId }, orderBy: { createdAt: 'asc' } });
  }
}
