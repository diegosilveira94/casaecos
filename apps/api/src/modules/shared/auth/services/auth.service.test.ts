import { beforeEach, describe, expect, it } from 'vitest';

import { Role } from '../../person/domain/person.js';
import { UserAccount } from '../domain/user-account.js';
import {
  DuplicateEmailError,
  GoogleIdentityAlreadyLinkedError,
  PersonAlreadyHasAccountError,
  type CreateUserAccountData,
  type UserAccountRepository,
} from '../repositories/user-account.repository.js';
import { AuthService } from './auth.service.js';
import type { GoogleIdentityVerifier, VerifiedGoogleIdentity } from './google-identity-verifier.js';
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
    googleSubject: null,
    role: new Role(2, 'Secretário'),
    homeIds: [],
    lastLoginAt: null,
    createdAt,
    updatedAt,
  });
}

class FakeUserAccountRepository implements UserAccountRepository {
  accountByEmail: UserAccount | null = makeAccount();
  accountByPersonId: UserAccount | null = null;
  personAvailable = true;
  writeError: Error | null = null;
  searchedEmail: string | null = null;
  createdData: CreateUserAccountData | null = null;
  registeredLogin: { id: number; at: Date } | null = null;
  updatedPassword: { id: number; passwordHash: string } | null = null;
  linkedGoogleSubject: { id: number; subject: string } | null = null;
  accountByGoogleSubject: UserAccount | null = null;
  googleLinkError: Error | null = null;
  accounts: UserAccount[] = [makeAccount()];

  findAll(): Promise<UserAccount[]> {
    return Promise.resolve(this.accounts);
  }

  findByEmail(email: string): Promise<UserAccount | null> {
    this.searchedEmail = email;
    return Promise.resolve(this.accountByEmail);
  }

  findByPersonId(_personId: number): Promise<UserAccount | null> {
    return Promise.resolve(this.accountByPersonId);
  }

  findByGoogleSubject(_subject: string): Promise<UserAccount | null> {
    return Promise.resolve(this.accountByGoogleSubject);
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

  updatePassword(id: number, passwordHash: string): Promise<void> {
    this.updatedPassword = { id, passwordHash };
    return Promise.resolve();
  }

  linkGoogleSubject(id: number, subject: string): Promise<void> {
    if (this.googleLinkError) return Promise.reject(this.googleLinkError);
    this.linkedGoogleSubject = { id, subject };
    return Promise.resolve();
  }
}

// Fake hash: real bcrypt at 12 rounds would slow the suite down without testing
// anything beyond the library itself.
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

  verify(_token: string): Promise<AuthTokenClaims> {
    return Promise.resolve({ personId: 7, email: 'maria@ecos.org', roleId: 2 });
  }
}

class FakeGoogleIdentityVerifier implements GoogleIdentityVerifier {
  identity: VerifiedGoogleIdentity | null = {
    subject: 'google-subject-7',
    email: 'maria@ecos.org',
  };

  verify(_idToken: string): Promise<VerifiedGoogleIdentity | null> {
    return Promise.resolve(this.identity);
  }
}

describe('AuthService', () => {
  let repository: FakeUserAccountRepository;
  let passwordHasher: FakePasswordHasher;
  let tokenIssuer: FakeTokenIssuer;
  let googleIdentityVerifier: FakeGoogleIdentityVerifier;
  let service: AuthService;

  beforeEach(() => {
    repository = new FakeUserAccountRepository();
    passwordHasher = new FakePasswordHasher();
    tokenIssuer = new FakeTokenIssuer();
    googleIdentityVerifier = new FakeGoogleIdentityVerifier();
    service = new AuthService(repository, passwordHasher, tokenIssuer, googleIdentityVerifier);
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
        permissions: [
          'person:read',
          'person:write',
          'home:read',
          'home:write',
          'event:read',
          'event:write',
        ],
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

  it('entra com uma conta Google autorizada e a vincula no primeiro acesso', async () => {
    const result = await service.loginWithGoogle({ credential: 'id-token-google' });

    expect(result.token).toBe('token-de-teste');
    expect(repository.searchedEmail).toBe('maria@ecos.org');
    expect(repository.linkedGoogleSubject).toEqual({ id: 5, subject: 'google-subject-7' });
    expect(repository.registeredLogin?.id).toBe(5);
  });

  it('entra pelo vínculo Google existente sem depender do e-mail', async () => {
    repository.accountByGoogleSubject = makeAccount();
    googleIdentityVerifier.identity = {
      subject: 'google-subject-7',
      email: 'email-alterado@gmail.com',
    };

    await expect(service.loginWithGoogle({ credential: 'id-token-google' })).resolves.toMatchObject(
      {
        token: 'token-de-teste',
      },
    );
    expect(repository.searchedEmail).toBeNull();
    expect(repository.linkedGoogleSubject).toBeNull();
  });

  it('recusa conta Google inválida ou não cadastrada nos acessos', async () => {
    googleIdentityVerifier.identity = null;
    await expect(service.loginWithGoogle({ credential: 'invalido' })).rejects.toMatchObject({
      status: 401,
    });

    googleIdentityVerifier.identity = {
      subject: 'google-subject-99',
      email: 'sem-acesso@gmail.com',
    };
    repository.accountByEmail = null;
    await expect(service.loginWithGoogle({ credential: 'valido' })).rejects.toMatchObject({
      status: 403,
      message: 'Esta conta Google não possui acesso ao sistema. Fale com a Coordenação.',
    });
  });

  it('não vincula uma identidade Google já usada por outra conta', async () => {
    repository.googleLinkError = new GoogleIdentityAlreadyLinkedError();

    await expect(service.loginWithGoogle({ credential: 'id-token-google' })).rejects.toMatchObject({
      status: 403,
    });
  });

  it('responde igual para e-mail inexistente e senha errada, sem registrar login', async () => {
    const expected = { status: 401, message: 'E-mail ou senha inválidos' };

    await expect(
      service.login({ email: 'maria@ecos.org', password: 'senha-errada' }),
    ).rejects.toMatchObject(expected);

    repository.accountByEmail = null;
    await expect(
      service.login({ email: 'ninguem@ecos.org', password: CORRECT_PASSWORD }),
    ).rejects.toMatchObject(expected);

    expect(repository.registeredLogin).toBeNull();
  });

  it('compara a senha mesmo sem conta, para o tempo de resposta não revelar o e-mail', async () => {
    repository.accountByEmail = null;

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

  it('lista as credenciais com a pessoa, o papel e o último login, sem o hash da senha', async () => {
    const accounts = await service.listAccounts();

    expect(accounts).toEqual([
      {
        id: 5,
        person: { id: 7, name: 'Maria Silva' },
        role: { id: 2, description: 'Secretário' },
        email: 'maria@ecos.org',
        lastLoginAt: null,
      },
    ]);
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

  it('deixa a coordenação redefinir a senha sem conhecer a atual', async () => {
    repository.accountByPersonId = makeAccount();

    await expect(service.resetPassword(7, { password: 'senha-temporaria' })).resolves.toEqual({
      message: 'Senha redefinida com sucesso',
    });
    expect(repository.updatedPassword).toEqual({
      id: 5,
      passwordHash: 'hashed:senha-temporaria',
    });
  });

  it('informa quando a pessoa não tem credencial para redefinir', async () => {
    await expect(service.resetPassword(99, { password: 'senha-temporaria' })).rejects.toMatchObject(
      {
        status: 404,
        message: 'Credencial de acesso não encontrada',
      },
    );
  });
});
