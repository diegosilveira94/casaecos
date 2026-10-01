import { beforeEach, describe, expect, it } from 'vitest';

import { AccessScope } from '../../shared/auth/domain/access-scope.js';
import { HomeSummary } from '../../shared/home/domain/home.js';
import { PersonSummary } from '../../shared/person/domain/person.js';
import { ROLE_IDS } from '../../shared/person/domain/role-ids.js';
import { Event, EventParticipant, EventType, ParticipationType } from '../domain/event.js';
import type { PageRequest } from '../../../shared/pagination.js';
import {
  DuplicateEventParticipantError,
  type CreateEventData,
  type EventListCriteria,
  type EventPage,
  type EventRepository,
  type ParticipantData,
  type UpdateEventData,
} from '../repositories/event.repository.js';
import { EventService } from './event.service.js';

const DRIVER_ID = 30;
const CHILD_ID = 40;
const driverParticipation = new ParticipationType(4, 'Motorista');
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
    participants: participantIds.map(
      (personId) =>
        new EventParticipant(new PersonSummary(personId, 'João Motorista'), driverParticipation),
    ),
    createdAt,
    updatedAt,
  });
}

class FakeEventRepository implements EventRepository {
  events = [makeEvent(1, 1), makeEvent(2, 2)];
  homeAvailable = true;
  eventTypeAvailable = true;
  personAvailable = true;
  participationTypeAvailable = true;
  duplicateOnInsert = false;
  addedParticipant: { eventId: number; participant: ParticipantData } | null = null;
  updatedParticipant: { eventId: number; participant: ParticipantData } | null = null;
  removedParticipant: { eventId: number; personId: number } | null = null;
  createdData: CreateEventData | null = null;
  updatedData: { id: number; data: UpdateEventData } | null = null;
  softDeletedId: number | null = null;
  listedWith: { criteria: EventListCriteria; page: PageRequest } | null = null;

  findPage(criteria: EventListCriteria, page: PageRequest): Promise<EventPage> {
    this.listedWith = { criteria, page };
    return Promise.resolve({ events: this.events, total: 42 });
  }

  listEventTypes(): Promise<EventType[]> {
    return Promise.resolve([new EventType(1, 'Consulta médica'), new EventType(6, 'Outro')]);
  }

  findById(id: number): Promise<Event | null> {
    return Promise.resolve(this.events.find((event) => event.id === id) ?? null);
  }

  listParticipationTypes(): Promise<ParticipationType[]> {
    return Promise.resolve([new ParticipationType(1, 'Organizador'), driverParticipation]);
  }

  participationTypeExists(_id: number): Promise<boolean> {
    return Promise.resolve(this.participationTypeAvailable);
  }

  personExists(_id: number): Promise<boolean> {
    return Promise.resolve(this.personAvailable);
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

  addParticipant(eventId: number, participant: ParticipantData): Promise<void> {
    if (this.duplicateOnInsert) return Promise.reject(new DuplicateEventParticipantError());
    this.addedParticipant = { eventId, participant };
    return Promise.resolve();
  }

  updateParticipant(eventId: number, participant: ParticipantData): Promise<void> {
    this.updatedParticipant = { eventId, participant };
    return Promise.resolve();
  }

  removeParticipant(eventId: number, personId: number): Promise<void> {
    this.removedParticipant = { eventId, personId };
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

  describe('listagem', () => {
    const firstPage = { page: 1, pageSize: 50 };

    it('devolve a página com os compromissos serializados e o total', async () => {
      const result = await service.list({ page: 2, pageSize: 2 }, coordination);

      expect(result).toMatchObject({ page: 2, pageSize: 2, total: 42 });
      expect(result.items).toEqual(repository.events.map((event) => event.toResponse()));
      expect(repository.listedWith?.page).toEqual({ page: 2, pageSize: 2 });
    });

    it('repassa os filtros e converte o período em datas', async () => {
      await service.list(
        {
          ...firstPage,
          homeId: 1,
          personId: CHILD_ID,
          eventTypeId: 3,
          from: '2026-10-01T00:00:00-03:00',
          to: '2026-11-01T00:00:00-03:00',
        },
        coordination,
      );

      expect(repository.listedWith?.criteria).toEqual({
        scope: { kind: 'all' },
        homeId: 1,
        personId: CHILD_ID,
        eventTypeId: 3,
        startsFrom: new Date('2026-10-01T03:00:00.000Z'),
        startsBefore: new Date('2026-11-01T03:00:00.000Z'),
      });
    });

    it('não inventa filtro que não foi pedido', async () => {
      await service.list(firstPage, coordination);

      expect(repository.listedWith?.criteria).toEqual({ scope: { kind: 'all' } });
    });

    it.each([
      ['cuidador', caregiverOfHomeOne, { kind: 'homes', homeIds: [1] }],
      ['motorista', driver, { kind: 'participant', personId: DRIVER_ID }],
    ])('recorta a listagem pelo escopo do %s', async (_label, scope, expectedScope) => {
      await service.list({ ...firstPage, homeId: 2 }, scope);

      // The homeId filter travels next to the scope, never in place of it.
      expect(repository.listedWith?.criteria).toEqual({ scope: expectedScope, homeId: 2 });
    });
  });

  describe('tipos de compromisso', () => {
    it('lista os tipos serializados', async () => {
      await expect(service.listEventTypes()).resolves.toEqual([
        { id: 1, name: 'Consulta médica' },
        { id: 6, name: 'Outro' },
      ]);
    });
  });

  describe('tipos de participação', () => {
    it('lista os tipos serializados', async () => {
      await expect(service.listParticipationTypes()).resolves.toEqual([
        { id: 1, description: 'Organizador' },
        { id: 4, description: 'Motorista' },
      ]);
    });
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
        participants: [
          {
            person: { id: DRIVER_ID, name: 'João Motorista' },
            participationType: { id: 4, description: 'Motorista' },
          },
        ],
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

  describe('participantes', () => {
    const asOrganizer = { participationTypeId: 1 };

    it('adiciona a pessoa ao compromisso com o tipo de participação', async () => {
      await service.addParticipant(1, CHILD_ID, asOrganizer, coordination);

      expect(repository.addedParticipant).toEqual({
        eventId: 1,
        participant: { personId: CHILD_ID, participationTypeId: 1 },
      });
    });

    it('responde 409 quando a pessoa já participa, sem tocar no banco', async () => {
      await expect(
        service.addParticipant(1, DRIVER_ID, asOrganizer, coordination),
      ).rejects.toMatchObject({ status: 409, message: 'Pessoa já participa deste compromisso' });
      expect(repository.addedParticipant).toBeNull();
    });

    it('responde 409 quando o vínculo surge entre a checagem e a gravação', async () => {
      repository.duplicateOnInsert = true;

      await expect(
        service.addParticipant(1, CHILD_ID, asOrganizer, coordination),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('responde 404 para pessoa inexistente e 400 para tipo de participação inexistente', async () => {
      repository.personAvailable = false;
      await expect(
        service.addParticipant(1, CHILD_ID, asOrganizer, coordination),
      ).rejects.toMatchObject({ status: 404, message: 'Pessoa não encontrada' });

      repository.personAvailable = true;
      repository.participationTypeAvailable = false;
      await expect(
        service.addParticipant(1, CHILD_ID, asOrganizer, coordination),
      ).rejects.toMatchObject({
        status: 400,
        message: 'Tipo de participação informado não existe',
      });
      expect(repository.addedParticipant).toBeNull();
    });

    it('trata compromisso inexistente ou removido como no restante da agenda', async () => {
      await expect(
        service.addParticipant(99, CHILD_ID, asOrganizer, coordination),
      ).rejects.toMatchObject({ status: 404, message: 'Compromisso não encontrado' });
      await expect(
        service.addParticipant(99, CHILD_ID, asOrganizer, caregiverOfHomeOne),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('checa o escopo do compromisso antes de olhar a pessoa', async () => {
      repository.personAvailable = false;

      await expect(
        service.addParticipant(2, CHILD_ID, asOrganizer, caregiverOfHomeOne),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('troca o tipo de participação de quem já participa', async () => {
      await service.updateParticipant(1, DRIVER_ID, asOrganizer, coordination);

      expect(repository.updatedParticipant).toEqual({
        eventId: 1,
        participant: { personId: DRIVER_ID, participationTypeId: 1 },
      });
    });

    it('recusa tipo de participação inexistente na troca', async () => {
      repository.participationTypeAvailable = false;

      await expect(
        service.updateParticipant(1, DRIVER_ID, asOrganizer, coordination),
      ).rejects.toMatchObject({ status: 400 });
      expect(repository.updatedParticipant).toBeNull();
    });

    it('remove a pessoa do compromisso', async () => {
      await service.removeParticipant(1, DRIVER_ID, coordination);

      expect(repository.removedParticipant).toEqual({ eventId: 1, personId: DRIVER_ID });
    });

    it('responde 404 ao trocar ou remover quem não participa', async () => {
      const notParticipant = {
        status: 404,
        message: 'Participante não encontrado neste compromisso',
      };

      await expect(
        service.updateParticipant(1, CHILD_ID, asOrganizer, coordination),
      ).rejects.toMatchObject(notParticipant);
      await expect(service.removeParticipant(1, CHILD_ID, coordination)).rejects.toMatchObject(
        notParticipant,
      );
      expect(repository.updatedParticipant).toBeNull();
      expect(repository.removedParticipant).toBeNull();
    });
  });
});
