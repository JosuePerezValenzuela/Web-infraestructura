import path from 'node:path';
import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
    },
    exclude: [...configDefaults.exclude, 'tests/**'],
  },
});

