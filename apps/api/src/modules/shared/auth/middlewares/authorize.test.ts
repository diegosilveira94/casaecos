import express, { type Express, type RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { errorHandler } from '../../../../middlewares/error-handler.js';
import { Role } from '../../person/domain/person.js';
import { ROLE_IDS } from '../../person/domain/role-ids.js';
import { AuthenticatedUser } from '../domain/user-account.js';
import { authorizeRoles } from './authorize.js';

function appWithUser(user: AuthenticatedUser | null): Express {
  const injectUser: RequestHandler = (httpRequest, _response, next) => {
    if (user) httpRequest.user = user;
    next();
  };

  const app = express();
  app.get(
    '/restrito',
    injectUser,
    authorizeRoles(ROLE_IDS.coordinator),
    (_httpRequest, response) => {
      response.json({ message: 'ok' });
    },
  );
  app.use(errorHandler);

  return app;
}

function makeUser(roleId: number, description: string): AuthenticatedUser {
  return new AuthenticatedUser({
    personId: 7,
    name: 'Maria Silva',
    email: 'maria@ecos.org',
    role: new Role(roleId, description),
  });
}

describe('authorizeRoles', () => {
  it('libera o papel permitido', async () => {
    const app = appWithUser(makeUser(ROLE_IDS.coordinator, 'Coordenador'));

    await expect(request(app).get('/restrito')).resolves.toMatchObject({ status: 200 });
  });

  it('barra papel fora da lista com 403', async () => {
    const app = appWithUser(makeUser(ROLE_IDS.caregiver, 'Cuidador/Monitor'));

    await expect(request(app).get('/restrito')).resolves.toMatchObject({
      status: 403,
      body: { message: 'Seu papel não permite esta ação' },
    });
  });

  it('responde 401 quando a rota não passou pela autenticação', async () => {
    const app = appWithUser(null);

    await expect(request(app).get('/restrito')).resolves.toMatchObject({ status: 401 });
  });
});
