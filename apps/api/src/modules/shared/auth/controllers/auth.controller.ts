import type { RequestHandler } from 'express';
import { z } from 'zod';

import { RequestValidator } from '../../../../middlewares/validate.js';
import { currentUser } from '../middlewares/authenticate.js';
import { authService } from '../services/auth.service.js';
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from '../services/password-hasher.js';

// trim antes do pipe: e-mail com espaço colado no fim é erro de digitação comum
// no celular, não e-mail inválido.
const emailSchema = z.string().trim().pipe(z.email('Informe um e-mail válido').max(255));

const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `A senha precisa de ao menos ${String(PASSWORD_MIN_LENGTH)} caracteres`)
  .refine((password) => Buffer.byteLength(password, 'utf8') <= PASSWORD_MAX_BYTES, {
    message: `A senha não pode passar de ${String(PASSWORD_MAX_BYTES)} caracteres`,
  });

// No login a senha não passa pela regra de tamanho: senha curta é credencial
// errada (401), não dado inválido (400) — e a regra mínima não deve ser deduzível
// a partir da resposta do login.
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

  // Usado pela tela ao recarregar a página: valida o token guardado e devolve
  // quem está logado sem pedir a senha de novo.
  me: RequestHandler = (request, response) => {
    response.json(currentUser(request).toResponse());
  };
}

export const authController = new AuthController();
