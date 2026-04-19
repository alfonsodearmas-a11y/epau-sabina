import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, '.') },
  },
  test: {
    include: [
      'lib/**/*.test.ts',
      'lib/**/*.test.tsx',
      'components/**/*.test.ts',
      'components/**/*.test.tsx',
      'scripts/**/*.test.ts',
    ],
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
});
