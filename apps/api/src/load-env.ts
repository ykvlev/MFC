import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';

/**
 * Загрузка окружения ДО импорта любого модуля, читающего process.env
 * (в первую очередь PrismaClient, который резолвит env("DATABASE_URL")
 * при инициализации движка). nest start / node dist/main.js запускаются
 * с cwd = apps/api, поэтому корневой .env монорепо не подхватывается сам.
 *
 * Ищем .env в нескольких предсказуемых местах: корень монорепо относительно
 * этого файла (dist/ или src/), затем cwd. Первый найденный — грузим.
 */
const candidates = [
  resolve(__dirname, '../../.env'), // apps/api/.env (локальный, если есть)
  resolve(__dirname, '../../../.env'), // корень монорепо из dist/ или src/
  resolve(__dirname, '../../../../.env'),
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
];

for (const path of candidates) {
  if (existsSync(path)) {
    loadEnv({ path });
    break;
  }
}
