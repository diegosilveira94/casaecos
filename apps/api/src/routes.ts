import { Router } from 'express';

import { agendaRouter } from './modules/agenda/routes/agenda.routes.js';
import { authRouter } from './modules/shared/auth/routes/auth.routes.js';
import { homeRouter, personHomeRouter } from './modules/shared/home/routes/home.routes.js';
import { personRouter, roleRouter } from './modules/shared/person/routes/person.routes.js';

export const apiRouter: Router = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/agenda', agendaRouter);
apiRouter.use('/homes', homeRouter);
apiRouter.use('/people', personHomeRouter);
apiRouter.use('/people', personRouter);
apiRouter.use('/roles', roleRouter);
