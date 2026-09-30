import { beforeEach, describe, expect, it } from 'vitest';

import { AccessScope } from '../../shared/auth/domain/access-scope.js';
import { HomeSummary } from '../../shared/home/domain/home.js';
import { ROLE_IDS } from '../../shared/person/domain/role-ids.js';
import { Event, EventType } from '../domain/event.js';
import type {
  CreateEventData,
  EventRepository,
  UpdateEventData,
} from '../repositories/event.repository.js';
import { EventService } from './event.service.js';

const DRIVER_ID = 30;
const createdAt = new Date('2026-09-01T10:00:00.000Z');
const updatedAt = new Date('2026-09-02T10:00:00.000Z');
const storedStart = new Date('2026-10-01T13:00:00.000Z');
const storedEnd = new Date('2026-10-01T14:00:00.000Z');

const coordination = AccessScope.forOwner({
  personId: 1,
  roleId: ROLE_IDS.secretary,
  homeIds: [],
});
const caregiverOfHomeOne = AccessScope.forOwner({
  personId: 2,
  roleId: ROLE_IDS.caregiver,
  homeIds: [1],
});
const driver = AccessScope.forOwner({ personId: DRIVER_ID, roleId: ROLE_IDS.driver, homeIds: [] });

function makeEvent(id = 1, homeId = 1, participantIds: readonly number[] = [DRIVER_ID]): Event {
  return new Event({
    id,
    title: 'Consulta pediatra',
    description: null,
    startDate: storedStart,
    endDate: storedEnd,
    address: null,
    eventType: new EventType(1, 'Consulta médica'),
    home: new HomeSummary(homeId, 'Casa Azul'),
    participantIds,
    createdAt,
    updatedAt,
  });
}

class FakeEventRepository implements EventRepository {
  events = [makeEvent(1, 1), makeEvent(2, 2)];
  homeAvailable = true;
  eventTypeAvailable = true;
  createdData: CreateEventData | null = null;
  updatedData: { id: number; data: UpdateEventData } | null = null;
  softDeletedId: number | null = null;

  findById(id: number): Promise<Event | null> {
    return Promise.resolve(this.events.find((event) => event.id === id) ?? null);
  }

  eventTypeExists(_id: number): Promise<boolean> {
    return Promise.resolve(this.eventTypeAvailable);
  }

  homeExists(_id: number): Promise<boolean> {
    return Promise.resolve(this.homeAvailable);
  }

  create(data: CreateEventData): Promise<Event> {
    this.createdData = data;
    return Promise.resolve(makeEvent());
  }

  update(id: number, data: UpdateEventData): Promise<Event> {
    this.updatedData = { id, data };
    return Promise.resolve(makeEvent(id));
  }

  softDelete(id: number): Promise<void> {
    this.softDeletedId = id;
    return Promise.resolve();
  }
}

const endBeforeStartError = {
  status: 400,
  message: 'O término do compromisso precisa ser depois do início',
  details: [
    { path: ['endDate'], message: 'O término do compromisso precisa ser depois do início' },
  ],
};

describe('EventService', () => {
  let repository: FakeEventRepository;
  let service: EventService;

  beforeEach(() => {
    repository = new FakeEventRepository();
    service = new EventService(repository);
  });

  describe('busca por id', () => {
    it('devolve o compromisso serializado', async () => {
      await expect(service.getById(1, coordination)).resolves.toEqual({
        id: 1,
        title: 'Consulta pediatra',
        description: null,
        startDate: storedStart.toISOString(),
        endDate: storedEnd.toISOString(),
        address: null,
        eventType: { id: 1, name: 'Consulta médica' },
        home: { id: 1, name: 'Casa Azul' },
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      });
    });

    it('responde 404 à coordenação quando o compromisso não existe', async () => {
      await expect(service.getById(99, coordination)).rejects.toMatchObject({
        status: 404,
        message: 'Compromisso não encontrado',
      });
    });

    it('responde 403 ao cuidador tanto para compromisso inexistente quanto de outra casa', async () => {
      const outOfScope = { status: 403, message: 'Você não tem acesso a este compromisso' };

      await expect(service.getById(99, caregiverOfHomeOne)).rejects.toMatchObject(outOfScope);
      await expect(service.getById(2, caregiverOfHomeOne)).rejects.toMatchObject(outOfScope);
      await expect(service.getById(1, caregiverOfHomeOne)).resolves.toMatchObject({ id: 1 });
    });

    it('deixa o motorista ver o compromisso em que participa, de qualquer casa', async () => {
      await expect(service.getById(2, driver)).resolves.toMatchObject({ id: 2 });

      repository.events = [makeEvent(3, 1, [])];
      await expect(service.getById(3, driver)).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('criação', () => {
    it('cria o compromisso normalizando textos e convertendo as datas', async () => {
      await service.create(
        {
          title: '  Consulta pediatra  ',
          description: '   ',
          startDate: '2026-10-01T10:00:00-03:00',
          endDate: '2026-10-01T11:00:00-03:00',
          address: '  Rua das Flores, 100 ',
          eventTypeId: 1,
          homeId: 1,
        },
        coordination,
      );

      expect(repository.createdData).toEqual({
        title: 'Consulta pediatra',
        description: null,
        startDate: new Date('2026-10-01T13:00:00.000Z'),
        endDate: new Date('2026-10-01T14:00:00.000Z'),
        address: 'Rua das Flores, 100',
        eventTypeId: 1,
        homeId: 1,
      });
    });

    it('aceita compromisso sem término', async () => {
      await service.create(
        { title: 'Escola', startDate: '2026-10-01T10:00:00Z', eventTypeId: 2, homeId: 1 },
        coordination,
      );

      expect(repository.createdData).toMatchObject({ endDate: null, description: null });
    });

    it.each([
      ['antes do início', '2026-10-01T09:00:00Z'],
      ['igual ao início', '2026-10-01T10:00:00Z'],
    ])('recusa término %s, marcando o campo endDate', async (_label, endDate) => {
      await expect(
        service.create(
          {
            title: 'Escola',
            startDate: '2026-10-01T10:00:00Z',
            endDate,
            eventTypeId: 2,
            homeId: 1,
          },
          coordination,
        ),
      ).rejects.toMatchObject(endBeforeStartError);
      expect(repository.createdData).toBeNull();
    });

    it('recusa casa ou tipo de compromisso inexistente', async () => {
      const request = {
        title: 'Escola',
        startDate: '2026-10-01T10:00:00Z',
        eventTypeId: 2,
        homeId: 1,
      };

      repository.homeAvailable = false;
      await expect(service.create(request, coordination)).rejects.toMatchObject({
        status: 400,
        message: 'Casa informada não existe',
      });

      repository.homeAvailable = true;
      repository.eventTypeAvailable = false;
      await expect(service.create(request, coordination)).rejects.toMatchObject({
        status: 400,
        message: 'Tipo de compromisso informado não existe',
      });
    });

    it('recusa criar compromisso em casa fora do escopo', async () => {
      await expect(
        service.create(
          { title: 'Escola', startDate: '2026-10-01T10:00:00Z', eventTypeId: 2, homeId: 2 },
          caregiverOfHomeOne,
        ),
      ).rejects.toMatchObject({ status: 403, message: 'Você não tem acesso a esta casa' });
    });
  });

  describe('edição', () => {
    it('edita somente os campos informados', async () => {
      await service.update(1, { title: ' Retorno pediatra ', address: '' }, coordination);

      expect(repository.updatedData).toEqual({
        id: 1,
        data: { title: 'Retorno pediatra', address: null },
      });
    });

    it('confere o término novo contra o início já gravado', async () => {
      await expect(
        service.update(1, { endDate: '2026-10-01T12:00:00Z' }, coordination),
      ).rejects.toMatchObject(endBeforeStartError);
    });

    it('confere o início novo contra o término já gravado', async () => {
      await expect(
        service.update(1, { startDate: '2026-10-01T15:00:00Z' }, coordination),
      ).rejects.toMatchObject(endBeforeStartError);
    });

    it('permite apagar o término e mover o início para depois dele', async () => {
      await service.update(1, { startDate: '2026-10-01T15:00:00Z', endDate: null }, coordination);

      expect(repository.updatedData?.data).toEqual({
        startDate: new Date('2026-10-01T15:00:00Z'),
        endDate: null,
      });
    });

    it('valida a casa de destino ao mover o compromisso', async () => {
      repository.homeAvailable = false;

      await expect(service.update(1, { homeId: 5 }, coordination)).rejects.toMatchObject({
        status: 400,
        message: 'Casa informada não existe',
      });
      expect(repository.updatedData).toBeNull();
    });

    it('responde 404 ao editar compromisso inexistente', async () => {
      await expect(service.update(99, { title: 'Escola' }, coordination)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('exclusão', () => {
    it('exclui o compromisso marcando-o como removido', async () => {
      await service.delete(1, coordination);

      expect(repository.softDeletedId).toBe(1);
    });

    it('responde 404 ao excluir compromisso inexistente, sem tocar no banco', async () => {
      await expect(service.delete(99, coordination)).rejects.toMatchObject({ status: 404 });
      expect(repository.softDeletedId).toBeNull();
    });
  });
});
