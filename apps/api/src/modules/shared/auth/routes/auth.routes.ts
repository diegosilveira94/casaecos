import { Router } from 'express';
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';

import type { ApiError } from '@casaecos/shared-types';

import { env } from '../../../../config/env.js';
import { ROLE_IDS } from '../../person/domain/role-ids.js';
import { TOO_MANY_LOGIN_ATTEMPTS } from '../auth-messages.js';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizeRoles } from '../middlewares/authorize.js';

/**
 * Attempt ceiling per IP on the login route. The generic error hides which e-mail
 * exists but does nothing against mass attempts on the password.
 *
 * Takes the ceiling as an argument so the test can exercise the 429 without
 * depending on the environment configuration.
 */
export function createLoginRateLimiter(
  maxAttempts = env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
): RateLimitRequestHandler {
  const tooManyAttempts: ApiError = { message: TOO_MANY_LOGIN_ATTEMPTS };

  return rateLimit({
    windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    limit: maxAttempts,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: tooManyAttempts,
  });
}

export const authRouter: Router = Router();

authRouter.post(
  '/login',
  createLoginRateLimiter(),
  authController.loginValidator.handle,
  authController.login,
);

// Creating a credential is a coordinator action. The first coordinator is created
// outside the API by `npm run db:seed:admin`, since there is nobody to authenticate
// as before it exists.
authRouter.post(
  '/accounts',
  authenticate.handle,
  authorizeRoles(ROLE_IDS.coordinator),
  authController.createAccountValidator.handle,
  authController.createAccount,
);

authRouter.get('/me', authenticate.handle, authController.getCurrentUser);
