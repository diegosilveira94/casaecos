import { Router } from 'express';

import { agendaRouter } from './modules/agenda/routes/agenda.routes.js';
import { requireAuth } from './modules/shared/auth/middlewares/auth.middleware.js';
import { authRouter } from './modules/shared/auth/routes/auth.routes.js';

export const apiRouter: Router = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/agenda', requireAuth, agendaRouter);
