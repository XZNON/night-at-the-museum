import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  server: { strictPort: true },
  preview: { strictPort: true },
  test: { include: ['tests/**/*.test.ts'] },
});
