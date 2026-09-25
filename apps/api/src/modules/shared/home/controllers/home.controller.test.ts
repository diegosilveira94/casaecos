import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

const { deleteHome, linkPerson, unlinkPerson } = vi.hoisted(() => ({
  deleteHome: vi.fn<(id: number) => Promise<void>>(),
  linkPerson: vi.fn<(homeId: number, personId: number) => Promise<void>>(),
  unlinkPerson: vi.fn<(homeId: number, personId: number) => Promise<void>>(),
}));

vi.mock('../services/home.service.js', () => ({
  homeService: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: deleteHome,
    linkPerson,
    unlinkPerson,
    listPeople: vi.fn(),
    listHomes: vi.fn(),
  },
}));

import { createApp } from '../../../../app.js';

describe('ações de casas', () => {
  it('confirma a exclusão da casa', async () => {
    deleteHome.mockResolvedValueOnce();

    const response = await request(createApp()).delete('/homes/7');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Casa excluída com sucesso' });
    expect(deleteHome).toHaveBeenCalledWith(7);
  });

  it('confirma o vínculo de uma pessoa à casa', async () => {
    linkPerson.mockResolvedValueOnce();

    const response = await request(createApp()).post('/homes/7/people/9');

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: 'Pessoa vinculada à casa com sucesso' });
    expect(linkPerson).toHaveBeenCalledWith(7, 9);
  });

  it('confirma a remoção do vínculo', async () => {
    unlinkPerson.mockResolvedValueOnce();

    const response = await request(createApp()).delete('/homes/7/people/9');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Pessoa desvinculada da casa com sucesso' });
    expect(unlinkPerson).toHaveBeenCalledWith(7, 9);
  });
});
