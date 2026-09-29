/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // The monorepo keeps a single .env at the root. Only VITE_-prefixed variables
  // reach the browser, so the API secrets in that file stay out of the bundle.
  envDir: '../..',
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Fixed so the suite does not depend on the developer's .env.
    env: { VITE_API_URL: 'http://api.test' },
  },
});
