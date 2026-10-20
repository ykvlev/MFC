import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // NestJS DI резолвит зависимости конструктора по типам через
  // design:paramtypes. esbuild (дефолт vitest) эти метаданные не эмитит,
  // поэтому полный AppModule в тестах падал с undefined-инъекциями.
  // SWC эмитит метаданные декораторов — DI снова работает.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['test/integration/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
