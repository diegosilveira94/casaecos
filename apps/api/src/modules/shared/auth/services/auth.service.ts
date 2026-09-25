import type {
  CreateUserAccountRequest,
  LoginRequest,
  LoginResponse,
  UserAccountResponse,
} from '@casaecos/shared-types';

import { HttpError } from '../../../../middlewares/http-error.js';
import {
  EMAIL_IN_USE,
  INVALID_CREDENTIALS,
  PERSON_ALREADY_HAS_ACCOUNT,
  PERSON_NOT_FOUND,
} from '../auth-messages.js';
import type { UserAccount } from '../domain/user-account.js';
import {
  DuplicateEmailError,
  PersonAlreadyHasAccountError,
  PrismaUserAccountRepository,
  type UserAccountRepository,
} from '../repositories/user-account.repository.js';
import { BcryptPasswordHasher, type PasswordHasher } from './password-hasher.js';
import { JwtTokenIssuer, type TokenIssuer } from './token-issuer.js';

/**
 * Hash of a random password nobody knows, compared when the e-mail does not exist.
 * Without it a login for an unknown e-mail would answer right away while a wrong
 * password would answer after bcrypt, and the gap would reveal which e-mails are
 * registered.
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

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const account = await this.findAccountMatching(credentials);

    await this.repository.registerLogin(account.id, new Date());

    const user = account.toAuthenticatedUser();
    const issuedToken = await this.tokenIssuer.issue({
      personId: user.personId,
      email: user.email,
      roleId: user.role.id,
    });

    return {
      token: issuedToken.token,
      expiresInSeconds: issuedToken.expiresInSeconds,
      user: user.toResponse(),
    };
  }

  async createAccount(request: CreateUserAccountRequest): Promise<UserAccountResponse> {
    await this.ensurePersonCanReceiveCredential(request.personId);

    const passwordHash = await this.passwordHasher.hash(request.password);

    try {
      const account = await this.repository.create({
        personId: request.personId,
        email: normalizeEmail(request.email),
        passwordHash,
      });

      return account.toResponse();
    } catch (error: unknown) {
      this.translatePersistenceError(error);
    }
  }

  /** Answers the same 401 for unknown e-mail and wrong password. */
  private async findAccountMatching(credentials: LoginRequest): Promise<UserAccount> {
    const account = await this.repository.findByEmail(normalizeEmail(credentials.email));

    const passwordMatches = await this.passwordHasher.matches(
      credentials.password,
      account?.passwordHash ?? UNUSABLE_PASSWORD_HASH,
    );

    if (!account || !passwordMatches) throw HttpError.unauthorized(INVALID_CREDENTIALS);

    return account;
  }

  private async ensurePersonCanReceiveCredential(personId: number): Promise<void> {
    if (!(await this.repository.personExists(personId))) {
      throw HttpError.badRequest(PERSON_NOT_FOUND);
    }

    // Checked before writing so the message does not depend on which unique index
    // the database happened to report; the repository error covers the race.
    if (await this.repository.findByPersonId(personId)) {
      throw HttpError.conflict(PERSON_ALREADY_HAS_ACCOUNT);
    }
  }

  private translatePersistenceError(error: unknown): never {
    if (error instanceof DuplicateEmailError) throw HttpError.conflict(EMAIL_IN_USE);
    if (error instanceof PersonAlreadyHasAccountError) {
      throw HttpError.conflict(PERSON_ALREADY_HAS_ACCOUNT);
    }
    throw error;
  }
}

export const authService = new AuthService(
  new PrismaUserAccountRepository(),
  new BcryptPasswordHasher(),
  new JwtTokenIssuer(),
);
