import express, { type Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { errorHandler } from '../../../../middlewares/error-handler.js';
import { HttpError } from '../../../../middlewares/http-error.js';
import { Role } from '../../person/domain/person.js';
import { UserAccount } from '../domain/user-account.js';
import type {
  CreateUserAccountData,
  UserAccountRepository,
} from '../repositories/user-account.repository.js';
import type { AuthTokenClaims, IssuedToken, TokenIssuer } from '../services/token-issuer.js';
import { AuthenticationMiddleware, currentUser } from './authenticate.js';

const VALID_TOKEN = 'token-valido';

function makeAccount(): UserAccount {
  return new UserAccount({
    id: 5,
    personId: 7,
    personName: 'Maria Silva',
    email: 'maria@ecos.org',
    passwordHash: 'irrelevante',
    role: new Role(2, 'Secretário'),
    lastLoginAt: null,
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    updatedAt: new Date('2026-09-01T10:00:00.000Z'),
  });
}

class StubRepository implements UserAccountRepository {
  account: UserAccount | null = makeAccount();
  requestedPersonId: number | null = null;

  findByEmail(_email: string): Promise<UserAccount | null> {
    return Promise.resolve(this.account);
  }

  findByPersonId(personId: number): Promise<UserAccount | null> {
    this.requestedPersonId = personId;
    return Promise.resolve(this.account);
  }

  personExists(_personId: number): Promise<boolean> {
    return Promise.resolve(true);
  }

  create(_data: CreateUserAccountData): Promise<UserAccount> {
    return Promise.resolve(makeAccount());
  }

  registerLogin(_id: number, _at: Date): Promise<void> {
    return Promise.resolve();
  }
}

class StubTokenIssuer implements TokenIssuer {
  issue(_claims: AuthTokenClaims): Promise<IssuedToken> {
    return Promise.resolve({ token: VALID_TOKEN, expiresInSeconds: 60 });
  }

  read(token: string): Promise<AuthTokenClaims> {
    // Mesmo erro que o JwtTokenIssuer levanta, para o teste exercitar o caminho real.
    if (token !== VALID_TOKEN) {
      return Promise.reject(
        HttpError.unauthorized('Sessão expirada ou inválida. Faça login novamente.'),
      );
    }
    return Promise.resolve({ personId: 7, email: 'maria@ecos.org', roleId: 2 });
  }
}

describe('AuthenticationMiddleware', () => {
  let repository: StubRepository;
  let app: Express;

  beforeEach(() => {
    repository = new StubRepository();
    const middleware = new AuthenticationMiddleware(new StubTokenIssuer(), repository);

    app = express();
    app.get('/protegido', middleware.handle, (httpRequest, response) => {
      response.json(currentUser(httpRequest).toResponse());
    });
    app.use(errorHandler);
  });

  it('injeta o usuário atual na requisição quando o token é válido', async () => {
    const response = await request(app)
      .get('/protegido')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      personId: 7,
      name: 'Maria Silva',
      email: 'maria@ecos.org',
      role: { id: 2, description: 'Secretário' },
    });
    expect(repository.requestedPersonId).toBe(7);
  });

  it('recusa requisição sem token ou com esquema diferente de Bearer', async () => {
    await expect(request(app).get('/protegido')).resolves.toMatchObject({
      status: 401,
      body: { message: 'Envie o token de acesso no cabeçalho Authorization' },
    });

    await expect(
      request(app).get('/protegido').set('Authorization', `Basic ${VALID_TOKEN}`),
    ).resolves.toMatchObject({ status: 401 });
  });

  it('recusa token que não passa pela verificação, sem consultar o banco', async () => {
    const response = await request(app).get('/protegido').set('Authorization', 'Bearer outro');

    expect(response.status).toBe(401);
    expect(repository.requestedPersonId).toBeNull();
  });

  it('recusa token de conta que não existe mais, sem esperar o token expirar', async () => {
    repository.account = null;

    const response = await request(app)
      .get('/protegido')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      message: 'Sessão expirada ou inválida. Faça login novamente.',
    });
  });
});
