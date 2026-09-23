import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['src/generated/**'],
    // A suíte não depende do .env da máquina: segredo fixo de teste, e teto de
    // login alto para o rate limit não derrubar os testes de validação.
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'segredo-apenas-para-a-suite-de-testes-do-casaecos',
      LOGIN_RATE_LIMIT_MAX_ATTEMPTS: '1000',
    },
  },
});
