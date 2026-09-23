import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

const { deletePerson } = vi.hoisted(() => ({
  deletePerson: vi.fn<(id: number) => Promise<void>>(),
}));

vi.mock('../services/person.service.js', () => ({
  personService: { delete: deletePerson },
}));

import { createApp } from '../../../../app.js';

describe('DELETE /people/:id', () => {
  it('confirma a exclusão da pessoa', async () => {
    deletePerson.mockResolvedValueOnce();

    const response = await request(createApp()).delete('/people/7');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Pessoa excluída com sucesso' });
    expect(deletePerson).toHaveBeenCalledWith(7);
  });
});
