import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { apiRouter } from './routes.js';

// Separate from server.ts so tests can mount the app without opening a port.
export function createApp(): Express {
  const app = express();

  // Behind the hosting proxy (Railway/Render) the real IP arrives in X-Forwarded-For;
  // without this the login rate limit would count every client as the same one.
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
