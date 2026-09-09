import { Router } from 'express';

import { authController } from '../controllers/auth.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

export const authRouter: Router = Router();

authRouter.post('/login', authController.login);
authRouter.post(
  '/credentials',
  requireAuth,
  requireRole('Coordenador'),
  authController.createCredential,
);
