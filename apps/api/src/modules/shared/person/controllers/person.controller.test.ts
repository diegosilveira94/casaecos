import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { deletePerson } = vi.hoisted(() => ({
  deletePerson: vi.fn<(id: number, actor: unknown) => Promise<void>>(),
}));

vi.mock('../../auth/middlewares/authenticate.js', async (importOriginal) => {
  const { fakeAuthentication } = await import('../../../../test/fake-authentication.js');
  return { ...(await importOriginal<object>()), authenticate: fakeAuthentication };
});

vi.mock('../services/person.service.js', () => ({
  personService: { delete: deletePerson },
}));

import { createApp } from '../../../../app.js';
import { fakeAuthentication } from '../../../../test/fake-authentication.js';
import { ROLE_IDS } from '../domain/role-ids.js';

describe('DELETE /people/:id', () => {
  beforeEach(() => {
    fakeAuthentication.signInAs(ROLE_IDS.coordinator);
  });

  it('confirma a exclusão da pessoa', async () => {
    deletePerson.mockResolvedValueOnce();

    const response = await request(createApp()).delete('/people/7');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Pessoa excluída com sucesso' });
    expect(deletePerson).toHaveBeenCalledWith(7, expect.anything());
  });
});
