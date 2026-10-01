import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['src/generated/**'],
    // The suite does not depend on the machine's .env: a fixed test secret, and a
    // high login ceiling so the rate limit does not knock the validation tests down.
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'segredo-apenas-para-a-suite-de-testes-do-casaecos',
      LOGIN_RATE_LIMIT_MAX_ATTEMPTS: '1000',
    },
  },
});
