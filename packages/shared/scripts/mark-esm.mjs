import { mkdirSync, writeFileSync } from 'node:fs';

// Помечаем ESM-сборку, иначе Node сочтёт .js внутри dist/esm за CommonJS.
mkdirSync('dist/esm', { recursive: true });
writeFileSync('dist/esm/package.json', JSON.stringify({ type: 'module' }, null, 2) + '\n');
