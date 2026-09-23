import { beforeEach, describe, expect, it } from 'vitest';

import { Role } from '../../person/domain/person.js';
import { UserAccount } from '../domain/user-account.js';
import {
  DuplicateEmailError,
  PersonAlreadyHasAccountError,
  type CreateUserAccountData,
  type UserAccountRepository,
} from '../repositories/user-account.repository.js';
import { AuthService } from './auth.service.js';
import type { PasswordHasher } from './password-hasher.js';
import type { AuthTokenClaims, IssuedToken, TokenIssuer } from './token-issuer.js';

const createdAt = new Date('2026-09-01T10:00:00.000Z');
const updatedAt = new Date('2026-09-02T10:00:00.000Z');

const CORRECT_PASSWORD = 'senha-correta';

function makeAccount(): UserAccount {
  return new UserAccount({
    id: 5,
    personId: 7,
    personName: 'Maria Silva',
    email: 'maria@ecos.org',
    passwordHash: `hashed:${CORRECT_PASSWORD}`,
    role: new Role(2, 'Secretário'),
    lastLoginAt: null,
    createdAt,
    updatedAt,
  });
}

class FakeUserAccountRepository implements UserAccountRepository {
  account: UserAccount | null = makeAccount();
  accountByPersonId: UserAccount | null = null;
  personAvailable = true;
  writeError: Error | null = null;
  searchedEmail: string | null = null;
  createdData: CreateUserAccountData | null = null;
  registeredLogin: { id: number; at: Date } | null = null;

  findByEmail(email: string): Promise<UserAccount | null> {
    this.searchedEmail = email;
    return Promise.resolve(this.account);
  }

  findByPersonId(_personId: number): Promise<UserAccount | null> {
    return Promise.resolve(this.accountByPersonId);
  }

  personExists(_personId: number): Promise<boolean> {
    return Promise.resolve(this.personAvailable);
  }

  create(data: CreateUserAccountData): Promise<UserAccount> {
    if (this.writeError) return Promise.reject(this.writeError);
    this.createdData = data;
    return Promise.resolve(makeAccount());
  }

  registerLogin(id: number, at: Date): Promise<void> {
    this.registeredLogin = { id, at };
    return Promise.resolve();
  }
}

// Hash falso: bcrypt real a 12 rounds deixaria a suíte lenta sem testar nada além
// da própria biblioteca.
class FakePasswordHasher implements PasswordHasher {
  comparedHashes: string[] = [];

  hash(plainPassword: string): Promise<string> {
    return Promise.resolve(`hashed:${plainPassword}`);
  }

  matches(plainPassword: string, passwordHash: string): Promise<boolean> {
    this.comparedHashes.push(passwordHash);
    return Promise.resolve(passwordHash === `hashed:${plainPassword}`);
  }
}

class FakeTokenIssuer implements TokenIssuer {
  receivedClaims: AuthTokenClaims | null = null;

  issue(claims: AuthTokenClaims): Promise<IssuedToken> {
    this.receivedClaims = claims;
    return Promise.resolve({ token: 'token-de-teste', expiresInSeconds: 28_800 });
  }

  read(_token: string): Promise<AuthTokenClaims> {
    return Promise.resolve({ personId: 7, email: 'maria@ecos.org', roleId: 2 });
  }
}

describe('AuthService', () => {
  let repository: FakeUserAccountRepository;
  let passwordHasher: FakePasswordHasher;
  let tokenIssuer: FakeTokenIssuer;
  let service: AuthService;

  beforeEach(() => {
    repository = new FakeUserAccountRepository();
    passwordHasher = new FakePasswordHasher();
    tokenIssuer = new FakeTokenIssuer();
    service = new AuthService(repository, passwordHasher, tokenIssuer);
  });

  it('autentica, devolve o usuário com o papel e registra o último login', async () => {
    const result = await service.login({ email: 'maria@ecos.org', password: CORRECT_PASSWORD });

    expect(result).toEqual({
      token: 'token-de-teste',
      expiresInSeconds: 28_800,
      user: {
        personId: 7,
        name: 'Maria Silva',
        email: 'maria@ecos.org',
        role: { id: 2, description: 'Secretário' },
      },
    });
    expect(tokenIssuer.receivedClaims).toEqual({
      personId: 7,
      email: 'maria@ecos.org',
      roleId: 2,
    });
    expect(repository.registeredLogin?.id).toBe(5);
  });

  it('normaliza o e-mail informado no login', async () => {
    await service.login({ email: '  MARIA@ecos.org ', password: CORRECT_PASSWORD });

    expect(repository.searchedEmail).toBe('maria@ecos.org');
  });

  it('responde igual para e-mail inexistente e senha errada, sem registrar login', async () => {
    const expected = { status: 401, message: 'E-mail ou senha inválidos' };

    await expect(
      service.login({ email: 'maria@ecos.org', password: 'senha-errada' }),
    ).rejects.toMatchObject(expected);

    repository.account = null;
    await expect(
      service.login({ email: 'ninguem@ecos.org', password: CORRECT_PASSWORD }),
    ).rejects.toMatchObject(expected);

    expect(repository.registeredLogin).toBeNull();
  });

  it('compara a senha mesmo sem conta, para o tempo de resposta não revelar o e-mail', async () => {
    repository.account = null;

    await expect(service.login({ email: 'ninguem@ecos.org', password: 'x' })).rejects.toThrow();

    expect(passwordHasher.comparedHashes).toHaveLength(1);
    expect(passwordHasher.comparedHashes[0]).toMatch(/^\$2b\$12\$/);
  });

  it('cria credencial com senha em hash e e-mail normalizado', async () => {
    const result = await service.createAccount({
      personId: 7,
      email: ' Maria@Ecos.ORG ',
      password: 'senha-nova-123',
    });

    expect(repository.createdData).toEqual({
      personId: 7,
      email: 'maria@ecos.org',
      passwordHash: 'hashed:senha-nova-123',
    });
    expect(result).toEqual({
      id: 5,
      personId: 7,
      email: 'maria@ecos.org',
      lastLoginAt: null,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('recusa credencial para pessoa inexistente', async () => {
    repository.personAvailable = false;

    await expect(
      service.createAccount({ personId: 99, email: 'a@ecos.org', password: 'senha-nova-123' }),
    ).rejects.toMatchObject({ status: 400, message: 'Pessoa informada não existe' });
  });

  it('recusa credencial para pessoa que já tem uma', async () => {
    repository.accountByPersonId = makeAccount();

    await expect(
      service.createAccount({ personId: 7, email: 'a@ecos.org', password: 'senha-nova-123' }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Esta pessoa já possui credencial de acesso',
    });
    expect(repository.createdData).toBeNull();
  });

  it('distingue e-mail já usado de pessoa que já tem credencial na corrida do banco', async () => {
    repository.writeError = new DuplicateEmailError();
    await expect(
      service.createAccount({ personId: 7, email: 'a@ecos.org', password: 'senha-nova-123' }),
    ).rejects.toMatchObject({ status: 409, message: 'Este e-mail já está em uso' });

    repository.writeError = new PersonAlreadyHasAccountError();
    await expect(
      service.createAccount({ personId: 7, email: 'b@ecos.org', password: 'senha-nova-123' }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Esta pessoa já possui credencial de acesso',
    });
  });
});
