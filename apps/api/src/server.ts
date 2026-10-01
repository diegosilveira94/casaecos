import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';

const app = createApp();

const server = app.listen(env.API_PORT, () => {
  console.log(`API do EcoAgenda ouvindo em http://localhost:${String(env.API_PORT)}`);
});

// Without this, every watch restart leaves the previous connection open on Postgres.
function shutdown(signal: string): void {
  console.log(`Recebido ${signal}, encerrando...`);
  server.close(() => {
    void prisma.$disconnect().finally(() => {
      process.exit(0);
    });
  });
}

process.on('SIGINT', () => {
  shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});
