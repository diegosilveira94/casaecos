import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { apiRouter } from './routes.js';

// Separado de server.ts para os testes montarem o app sem abrir porta.
export function createApp(): Express {
  const app = express();

  // Atrás do proxy da hospedagem (Railway/Render) o IP real vem em X-Forwarded-For;
  // sem isto o rate limit do login contaria todo mundo como o mesmo cliente.
  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.use(apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
