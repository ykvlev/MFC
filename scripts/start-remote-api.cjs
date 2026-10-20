const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');

const root = resolve(__dirname, '..');
const apiDirectory = resolve(root, 'apps/api');
const apiRequire = createRequire(resolve(apiDirectory, 'package.json'));
const remoteFile = resolve(root, '.env.remote');
if (!existsSync(remoteFile)) throw new Error('Создай локальный .env.remote с DATABASE_URL');
apiRequire('dotenv').config({ path: resolve(root, '.env'), quiet: true });
const loaded = apiRequire('dotenv').config({ path: remoteFile, override: true, quiet: true });
if (loaded.error) throw new Error('Не удалось прочитать .env.remote');
const database = new URL(loaded.parsed?.DATABASE_URL ?? '');
if (database.searchParams.get('schema') !== 'mfc') {
  throw new Error('Удалённый запуск разрешён только для схемы mfc');
}
if (!existsSync(resolve(apiDirectory, 'dist/main.js'))) {
  throw new Error('Сначала выполни pnpm --filter @edinoe-okno/api build');
}
console.log('Запуск API с удалённой схемой mfc; локальный .env не изменяется.');
const server = spawn(process.execPath, ['dist/main.js'], {
  cwd: apiDirectory,
  env: process.env,
  stdio: 'inherit',
});
server.on('error', () => { console.error('Не удалось запустить API'); process.exitCode = 1; });
server.on('exit', code => { process.exitCode = code ?? 1; });
