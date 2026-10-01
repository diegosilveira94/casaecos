import type { RequestHandler } from 'express';
import { z } from 'zod';

import { RequestValidator } from '../../../../middlewares/validate.js';
import { currentUser } from '../middlewares/authenticate.js';
import { authService } from '../services/auth.service.js';
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from '../services/password-hasher.js';

// Trim before the format check: a trailing space typed on a phone is a typo, not
// an invalid e-mail.
const emailSchema = z.string().trim().pipe(z.email('Informe um e-mail válido').max(255));

const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `A senha precisa de ao menos ${String(PASSWORD_MIN_LENGTH)} caracteres`)
  .refine((password) => Buffer.byteLength(password, 'utf8') <= PASSWORD_MAX_BYTES, {
    message: `A senha não pode passar de ${String(PASSWORD_MAX_BYTES)} caracteres`,
  });

// Login does not apply the password rules: a short password is a wrong credential
// (401), not invalid input (400), and the rule should not leak from this route.
const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, 'Informe a senha').max(255),
  })
  .strict();

const createAccountSchema = z
  .object({
    personId: z.number().int().positive(),
    email: emailSchema,
    password: newPasswordSchema,
  })
  .strict();

export class AuthController {
  readonly loginValidator = new RequestValidator({ body: loginSchema });
  readonly createAccountValidator = new RequestValidator({ body: createAccountSchema });

  login: RequestHandler = async (_request, response) => {
    const { body } = this.loginValidator.data(response);
    response.json(await authService.login(body));
  };

  createAccount: RequestHandler = async (_request, response) => {
    const { body } = this.createAccountValidator.data(response);
    response.status(201).json(await authService.createAccount(body));
  };

  getCurrentUser: RequestHandler = (request, response) => {
    response.json(currentUser(request).toResponse());
  };
}

export const authController = new AuthController();
