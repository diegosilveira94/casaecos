import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateEventData } from './event.repository.js';

const { create, findFirst } = vi.hoisted(() => ({
  create: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock('../../../config/prisma.js', () => ({
  prisma: {
    event: {
      create,
      findFirst,
    },
  },
}));

import { PrismaEventRepository } from './event.repository.js';

const data: CreateEventData = {
  title: 'Consulta médica',
  description: null,
  startDate: new Date('2026-12-01T13:00:00.000Z'),
  endDate: null,
  address: null,
  eventTypeId: 1,
  homeId: 1,
};

const eventRecord = {
  id: 1,
  title: data.title,
  description: data.description,
  startDate: data.startDate,
  endDate: data.endDate,
  address: data.address,
  eventType: { id: 1, name: 'Consulta médica' },
  home: { id: 1, name: 'Casa Teste' },
  personLinks: [],
  createdAt: new Date('2026-11-24T12:00:00.000Z'),
  updatedAt: new Date('2026-11-24T12:00:00.000Z'),
};

describe('criação de compromisso no repositório', () => {
  const repository = new PrismaEventRepository();

  beforeEach(() => {
    create.mockReset().mockResolvedValue({ id: 1 });
    findFirst.mockReset().mockResolvedValue(eventRecord);
  });

  it('cria o compromisso selecionando apenas o id', async () => {
    await repository.create(data);

    expect(create).toHaveBeenCalledWith({
      data,
      select: { id: true },
    });
  });

  it('recupera o compromisso completo após a criação', async () => {
    const event = await repository.create(data);

    expect(findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 1, deletedAt: null },
    });

    expect(event.toResponse()).toEqual({
      id: 1,
      title: data.title,
      description: null,
      startDate: data.startDate.toISOString(),
      endDate: null,
      address: null,
      eventType: eventRecord.eventType,
      home: eventRecord.home,
      participants: [],
      createdAt: eventRecord.createdAt.toISOString(),
      updatedAt: eventRecord.updatedAt.toISOString(),
    });
  });

  it('lança um erro quando o compromisso criado não é encontrado', async () => {
    findFirst.mockResolvedValueOnce(null);

    await expect(repository.create(data)).rejects.toThrow('Created event could not be found');
  });
});
