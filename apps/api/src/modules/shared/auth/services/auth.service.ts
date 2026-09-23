import type {
  CreateUserAccountRequest,
  LoginRequest,
  LoginResponse,
  UserAccountResponse,
} from '@casaecos/shared-types';

import { HttpError } from '../../../../middlewares/http-error.js';
import {
  DuplicateEmailError,
  PersonAlreadyHasAccountError,
  PrismaUserAccountRepository,
  type UserAccountRepository,
} from '../repositories/user-account.repository.js';
import { BcryptPasswordHasher, type PasswordHasher } from './password-hasher.js';
import { JwtTokenIssuer, type TokenIssuer } from './token-issuer.js';

// Mesma mensagem para e-mail inexistente e senha errada: dizer qual dos dois
// falhou entregaria a lista de quem tem acesso ao sistema.
const INVALID_CREDENTIALS_MESSAGE = 'E-mail ou senha inválidos';

const PERSON_ALREADY_HAS_ACCOUNT_MESSAGE = 'Esta pessoa já possui credencial de acesso';

/**
 * Hash de uma senha aleatória que ninguém conhece, comparado quando o e-mail não
 * existe. Sem isso o login de e-mail inexistente responderia na hora e o de senha
 * errada depois do bcrypt — e a diferença de tempo revelaria os e-mails cadastrados.
 */
const UNUSABLE_PASSWORD_HASH = '$2b$12$SPMF.GsrV2HNE4Emcl8l1.MqJQWIJusTz7olp/seU7y/7cfKoRvM.';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class AuthService {
  constructor(
    private readonly repository: UserAccountRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenIssuer: TokenIssuer,
  ) {}

  async login(request: LoginRequest): Promise<LoginResponse> {
    const account = await this.repository.findByEmail(normalizeEmail(request.email));

    const passwordMatches = await this.passwordHasher.matches(
      request.password,
      account?.passwordHash ?? UNUSABLE_PASSWORD_HASH,
    );

    if (!account || !passwordMatches) {
      throw HttpError.unauthorized(INVALID_CREDENTIALS_MESSAGE);
    }

    await this.repository.registerLogin(account.id, new Date());

    const user = account.toAuthenticatedUser();
    const issued = await this.tokenIssuer.issue({
      personId: user.personId,
      email: user.email,
      roleId: user.role.id,
    });

    return {
      token: issued.token,
      expiresInSeconds: issued.expiresInSeconds,
      user: user.toResponse(),
    };
  }

  async createAccount(request: CreateUserAccountRequest): Promise<UserAccountResponse> {
    if (!(await this.repository.personExists(request.personId))) {
      throw HttpError.badRequest('Pessoa informada não existe');
    }

    // Checa antes de gravar para a mensagem não depender de qual índice único o
    // banco acusou primeiro; o erro do repositório cobre a corrida entre requisições.
    if (await this.repository.findByPersonId(request.personId)) {
      throw HttpError.conflict(PERSON_ALREADY_HAS_ACCOUNT_MESSAGE);
    }

    const passwordHash = await this.passwordHasher.hash(request.password);

    try {
      const account = await this.repository.create({
        personId: request.personId,
        email: normalizeEmail(request.email),
        passwordHash,
      });

      return account.toResponse();
    } catch (error: unknown) {
      if (error instanceof DuplicateEmailError) {
        throw HttpError.conflict('Este e-mail já está em uso');
      }
      if (error instanceof PersonAlreadyHasAccountError) {
        throw HttpError.conflict(PERSON_ALREADY_HAS_ACCOUNT_MESSAGE);
      }
      throw error;
    }
  }
}

export const authService = new AuthService(
  new PrismaUserAccountRepository(),
  new BcryptPasswordHasher(),
  new JwtTokenIssuer(),
);
