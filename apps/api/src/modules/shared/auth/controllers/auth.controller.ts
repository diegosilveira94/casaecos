import type { RequestHandler } from 'express';
import { z } from 'zod';

import type {
  CreateCredentialRequest,
  CredentialResponse,
  LoginRequest,
  LoginResponse,
} from '@casaecos/shared-types';

import { authService } from '../services/auth.service.js';

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const createCredentialSchema = z.object({
  personId: z.number().int().positive(),
  email: z.email(),
  password: z.string().min(8),
});

export class AuthController {
  login: RequestHandler = async (request, response) => {
    const body: LoginRequest = loginSchema.parse(request.body);
    const result: LoginResponse = await authService.login(body);
    response.json(result);
  };

  createCredential: RequestHandler = async (request, response) => {
    const body: CreateCredentialRequest = createCredentialSchema.parse(request.body);
    const result: CredentialResponse = await authService.createCredential(body);
    response.status(201).json(result);
  };
}

export const authController = new AuthController();
