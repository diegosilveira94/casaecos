import { Router } from 'express';
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';

import type { ApiError } from '@casaecos/shared-types';

import { env } from '../../../../config/env.js';
import { ROLE_IDS } from '../../person/domain/role-ids.js';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizeRoles } from '../middlewares/authorize.js';

const TOO_MANY_ATTEMPTS: ApiError = {
  message: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
};

/**
 * Teto de tentativas por IP na rota de login. O 401 genérico esconde qual e-mail
 * existe, mas não impede tentativa em massa contra a senha.
 *
 * Recebe o limite por parâmetro para o teste poder exercitar o 429 sem depender
 * da configuração do ambiente.
 */
export function createLoginRateLimiter(
  maxAttempts = env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
): RateLimitRequestHandler {
  return rateLimit({
    windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    limit: maxAttempts,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: TOO_MANY_ATTEMPTS,
  });
}

export const authRouter: Router = Router();

authRouter.post(
  '/login',
  createLoginRateLimiter(),
  authController.loginValidator.handle,
  authController.login,
);

// Criar credencial é ação de Coordenador. O primeiro coordenador nasce fora da
// API, pelo script `npm run db:seed:admin` — não há como autenticar antes dele.
authRouter.post(
  '/accounts',
  authenticate.handle,
  authorizeRoles(ROLE_IDS.coordinator),
  authController.createAccountValidator.handle,
  authController.createAccount,
);

authRouter.get('/me', authenticate.handle, authController.me);
