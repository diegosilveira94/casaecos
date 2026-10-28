import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listOrganizations } = vi.hoisted(() => ({
  listOrganizations: vi.fn<() => Promise<{ id: number; name: string }[]>>(),
}));

vi.mock('../../auth/middlewares/authenticate.js', async (importOriginal) => {
  const { fakeAuthentication } = await import('../../../../test/fake-authentication.js');
  return { ...(await importOriginal<object>()), authenticate: fakeAuthentication };
});

vi.mock('../services/organization.service.js', () => ({
  organizationService: { list: listOrganizations },
}));

import { createApp } from '../../../../app.js';
import { fakeAuthentication } from '../../../../test/fake-authentication.js';
import { ROLE_IDS } from '../../person/domain/role-ids.js';

describe('rotas de organizações', () => {
  beforeEach(() => {
    listOrganizations.mockResolvedValue([{ id: 1, name: 'Associação Ecos da Esperança' }]);
    fakeAuthentication.signInAs(ROLE_IDS.secretary);
  });

  it('lista as organizações para quem cadastra casas', async () => {
    const response = await request(createApp()).get('/organizations');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 1, name: 'Associação Ecos da Esperança' }]);
  });

  it('exige login e permissão de escrita em casas', async () => {
    fakeAuthentication.signInAs(ROLE_IDS.caregiver, [1]);
    await expect(request(createApp()).get('/organizations')).resolves.toMatchObject({
      status: 403,
    });

    fakeAuthentication.signOut();
    await expect(request(createApp()).get('/organizations')).resolves.toMatchObject({
      status: 401,
    });
  });
});
