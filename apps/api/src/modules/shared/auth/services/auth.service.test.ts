import { compare, hash } from 'bcryptjs';
import { beforeEach, describe, expect, it } from 'vitest';

import type {
  AuthRepository,
  AuthenticatedAccount,
  CreatedCredential,
  PersonCredentialStatus,
} from '../repositories/auth.repository.js';
import { AuthService } from './auth.service.js';
import { TokenService } from './token.service.js';

class FakeAuthRepository implements AuthRepository {
  account: AuthenticatedAccount | null = null;
  person: PersonCredentialStatus | null = null;
  existingEmail = false;
  lastLogin: { accountId: number; date: Date } | null = null;
  createdPasswordHash: string | null = null;

  findAccountByEmail(_email: string): Promise<AuthenticatedAccount | null> {
    return Promise.resolve(this.account);
  }

  updateLastLogin(accountId: number, date: Date): Promise<void> {
    this.lastLogin = { accountId, date };
    return Promise.resolve();
  }

  emailExists(_email: string): Promise<boolean> {
    return Promise.resolve(this.existingEmail);
  }

  findPersonCredentialStatus(_personId: number): Promise<PersonCredentialStatus | null> {
    return Promise.resolve(this.person);
  }

  createCredential(
    personId: number,
    email: string,
    passwordHash: string,
  ): Promise<CreatedCredential> {
    this.createdPasswordHash = passwordHash;
    return Promise.resolve({ id: 10, personId, email });
  }
}

describe('AuthService', () => {
  let repository: FakeAuthRepository;
  let tokens: TokenService;
  let service: AuthService;

  beforeEach(() => {
    repository = new FakeAuthRepository();
    tokens = new TokenService('test-secret-with-at-least-32-characters', 3600);
    service = new AuthService(repository, tokens, 4);
  });

  it('emite um JWT com pessoa e papel e atualiza o último login', async () => {
    repository.account = {
      accountId: 7,
      passwordHash: await hash('senha-segura', 4),
      personId: 3,
      role: 'Coordenador',
    };

    const result = await service.login({ email: ' ADMIN@ECOS.ORG ', password: 'senha-segura' });

    await expect(tokens.verify(result.token)).resolves.toEqual({
      personId: 3,
      role: 'Coordenador',
    });
    expect(repository.lastLogin?.accountId).toBe(7);
    expect(repository.lastLogin?.date).toBeInstanceOf(Date);
  });

  it('retorna o mesmo erro genérico para credenciais inválidas', async () => {
    await expect(
      service.login({ email: 'inexistente@ecos.org', password: 'qualquer' }),
    ).rejects.toMatchObject({
      status: 401,
      message: 'E-mail ou senha incorretos',
    });
  });

  it('cria uma credencial com e-mail normalizado e senha em hash', async () => {
    repository.person = { personId: 3, hasCredential: false };

    const result = await service.createCredential({
      personId: 3,
      email: ' NOVO@ECOS.ORG ',
      password: 'senha-segura',
    });

    expect(result).toEqual({ id: 10, personId: 3, email: 'novo@ecos.org' });
    expect(repository.createdPasswordHash).not.toBe('senha-segura');
    await expect(compare('senha-segura', repository.createdPasswordHash ?? '')).resolves.toBe(true);
  });

  it('impede e-mail ou pessoa com credencial duplicada', async () => {
    repository.existingEmail = true;

    await expect(
      service.createCredential({ personId: 3, email: 'admin@ecos.org', password: 'senha-segura' }),
    ).rejects.toMatchObject({ status: 409, message: 'Este e-mail já está em uso' });

    repository.existingEmail = false;
    repository.person = { personId: 3, hasCredential: true };

    await expect(
      service.createCredential({ personId: 3, email: 'novo@ecos.org', password: 'senha-segura' }),
    ).rejects.toMatchObject({ status: 409, message: 'Esta pessoa já possui uma credencial' });
  });
});
