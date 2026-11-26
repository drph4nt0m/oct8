import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/tests/**', 'src/types.d.ts', '**/node_modules/**'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
      },
    },
  },
  resolve: {
    alias: [
      { find: /^#core\/(.*?)(?:\.js)?$/, replacement: path.resolve(__dirname, 'src/core/$1.ts') },
      { find: /^#infra\/(.*?)(?:\.js)?$/, replacement: path.resolve(__dirname, 'src/infra/$1.ts') },
      { find: /^#api\/(.*?)(?:\.js)?$/, replacement: path.resolve(__dirname, 'src/api/$1.ts') },
      {
        find: /^#services\/(.*?)(?:\.js)?$/,
        replacement: path.resolve(__dirname, 'src/services/$1.ts'),
      },
      { find: /^#tests\/(.*?)(?:\.js)?$/, replacement: path.resolve(__dirname, 'src/tests/$1.ts') },
    ],
  },
});
