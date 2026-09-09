import { createReadStream } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import { Injectable } from '@nestjs/common';
import type { StorageDriver } from './storage.interface.js';

/** Резервный драйвер для локальной разработки/тестов без MinIO. */
@Injectable()
export class LocalStorage implements StorageDriver {
  private readonly root = resolve(process.cwd(), 'storage-data');

  private path(key: string): string {
    return join(this.root, key);
  }

  async put(key: string, body: Buffer): Promise<void> {
    const p = this.path(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, body);
  }

  async get(key: string): Promise<Readable> {
    return createReadStream(this.path(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.path(key), { force: true });
  }
}
