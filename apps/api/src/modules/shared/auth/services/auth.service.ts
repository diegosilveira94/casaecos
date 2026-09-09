import { compare, hash } from 'bcryptjs';

import type {
  CreateCredentialRequest,
  CredentialResponse,
  LoginRequest,
  LoginResponse,
} from '@casaecos/shared-types';

import { HttpError } from '../../../../middlewares/http-error.js';
import { PrismaAuthRepository, type AuthRepository } from '../repositories/auth.repository.js';
import { tokenService, type TokenService } from './token.service.js';

const INVALID_CREDENTIALS_MESSAGE = 'E-mail ou senha incorretos';

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly tokens: TokenService,
    private readonly passwordHashRounds = 12,
  ) {}

  async login(request: LoginRequest): Promise<LoginResponse> {
    const email = request.email.trim().toLowerCase();
    const account = await this.repository.findAccountByEmail(email);

    if (!account || !(await compare(request.password, account.passwordHash))) {
      throw HttpError.unauthorized(INVALID_CREDENTIALS_MESSAGE);
    }

    const token = await this.tokens.sign({ personId: account.personId, role: account.role });
    await this.repository.updateLastLogin(account.accountId, new Date());

    return { token };
  }

  async createCredential(request: CreateCredentialRequest): Promise<CredentialResponse> {
    const email = request.email.trim().toLowerCase();

    if (await this.repository.emailExists(email)) {
      throw HttpError.conflict('Este e-mail já está em uso');
    }

    const person = await this.repository.findPersonCredentialStatus(request.personId);

    if (!person) {
      throw HttpError.notFound('Pessoa não encontrada');
    }

    if (person.hasCredential) {
      throw HttpError.conflict('Esta pessoa já possui uma credencial');
    }

    const passwordHash = await hash(request.password, this.passwordHashRounds);
    return this.repository.createCredential(person.personId, email, passwordHash);
  }
}

export const authService = new AuthService(new PrismaAuthRepository(), tokenService);
