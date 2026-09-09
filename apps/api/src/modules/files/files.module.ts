import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration.js';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';
import { LocalStorage } from './storage/local.storage.js';
import { S3Storage } from './storage/s3.storage.js';
import { STORAGE_DRIVER } from './storage/storage.interface.js';

@Global()
@Module({
  controllers: [FilesController],
  providers: [
    FilesService,
    S3Storage,
    LocalStorage,
    {
      // MinIO/S3 в docker-compose; LocalStorage — если S3_ENDPOINT не задан.
      provide: STORAGE_DRIVER,
      inject: [ConfigService, S3Storage, LocalStorage],
      useFactory: (config: ConfigService<AppConfig, true>, s3: S3Storage, local: LocalStorage) =>
        config.get('s3', { infer: true }).endpoint ? s3 : local,
    },
  ],
  exports: [FilesService, STORAGE_DRIVER],
})
export class FilesModule {}
