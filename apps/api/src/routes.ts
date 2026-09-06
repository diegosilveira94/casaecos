import { Router } from 'express';

import { agendaRouter } from './modules/agenda/routes/agenda.routes.js';

export const apiRouter: Router = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

apiRouter.use('/agenda', agendaRouter);
