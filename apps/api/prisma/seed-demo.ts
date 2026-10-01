import { prisma } from '../src/config/prisma.js';
import { BcryptPasswordHasher } from '../src/modules/shared/auth/services/password-hasher.js';
import { ROLE_IDS } from '../src/modules/shared/person/domain/role-ids.js';

/**
 * Demo data for local testing: two homes, the staff of each role with a credential,
 * sheltered children and commitments around the current month, so the agenda is
 * never empty. Runs once: if the demo accounts exist, it leaves everything alone.
 * Depends on the lookups (`npm run db:seed`).
 */

const DEMO_PASSWORD = 'casaecos-demo';

// Ids fixed by the position in prisma/seed.ts (#37).
const EVENT_TYPE = { health: 1, school: 2, therapy: 3, activity: 4, meeting: 5, other: 6 };
const PARTICIPATION = { organizer: 1, participant: 2, responsible: 3, driver: 4 };

/** Today plus `days`, at `time` (HH:MM) in the machine's time zone. */
function at(days: number, time: string): Date {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + days, hours, minutes);
}

async function createPerson(name: string, roleId: number): Promise<number> {
  const person = await prisma.person.create({ data: { name, roleId }, select: { id: true } });
  return person.id;
}

async function createAccount(personId: number, email: string, passwordHash: string) {
  await prisma.userAccount.create({ data: { personId, email, passwordHash } });
}

interface DemoEvent {
  title: string;
  eventTypeId: number;
  homeId: number;
  start: Date;
  end?: Date;
  address?: string;
  description?: string;
  participants?: [personId: number, participationTypeId: number][];
  removed?: boolean;
}

async function createEvent(event: DemoEvent): Promise<void> {
  await prisma.event.create({
    data: {
      title: event.title,
      eventTypeId: event.eventTypeId,
      homeId: event.homeId,
      startDate: event.start,
      endDate: event.end ?? null,
      address: event.address ?? null,
      description: event.description ?? null,
      deletedAt: event.removed ? new Date() : null,
      personLinks: {
        create: (event.participants ?? []).map(([personId, participationTypeId]) => ({
          personId,
          participationTypeId,
        })),
      },
    },
    select: { id: true },
  });
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Dados de demonstração não entram em produção.');
  }

  const existing = await prisma.userAccount.findUnique({
    where: { email: 'secretaria@ecos.test' },
  });
  if (existing) {
    console.log('Os dados de demonstração já existem. Nada a fazer.');
    return;
  }

  const passwordHash = await new BcryptPasswordHasher().hash(DEMO_PASSWORD);

  const secretary = await createPerson('Maria Silva', ROLE_IDS.secretary);
  const caregiver = await createPerson('Ana Souza', ROLE_IDS.caregiver);
  const driver = await createPerson('Carlos Lima', ROLE_IDS.driver);
  const joao = await createPerson('João Pedro', ROLE_IDS.sheltered);
  const lucas = await createPerson('Lucas Gabriel', ROLE_IDS.sheltered);
  const clara = await createPerson('Maria Clara', ROLE_IDS.sheltered);

  await createAccount(secretary, 'secretaria@ecos.test', passwordHash);
  await createAccount(caregiver, 'cuidadora@ecos.test', passwordHash);
  await createAccount(driver, 'motorista@ecos.test', passwordHash);

  const organization = await prisma.organization.create({
    data: { name: 'Ecos da Esperança' },
    select: { id: true },
  });
  const createHome = async (name: string, responsibleId: number, peopleIds: number[]) => {
    const home = await prisma.home.create({
      data: {
        name,
        organizationId: organization.id,
        responsibleId,
        personLinks: { create: peopleIds.map((personId) => ({ personId })) },
      },
      select: { id: true },
    });
    return home.id;
  };
  // The caregiver is linked only to the first home: her agenda shows just that one.
  const esperanca = await createHome('Casa Esperança', caregiver, [caregiver, joao, lucas]);
  const fe = await createHome('Casa Fé', secretary, [clara]);

  const events: DemoEvent[] = [
    {
      title: 'Transporte para a escola',
      eventTypeId: EVENT_TYPE.school,
      homeId: esperanca,
      start: at(0, '07:30'),
      address: 'Escola Municipal Paranaguamirim',
      participants: [
        [lucas, PARTICIPATION.participant],
        [driver, PARTICIPATION.driver],
      ],
    },
    {
      title: 'Consulta pediátrica',
      eventTypeId: EVENT_TYPE.health,
      homeId: esperanca,
      start: at(0, '09:00'),
      end: at(0, '10:00'),
      address: 'UBS Paranaguamirim',
      description: 'Levar a carteirinha de vacinação.',
      participants: [
        [joao, PARTICIPATION.participant],
        [caregiver, PARTICIPATION.responsible],
      ],
    },
    {
      title: 'Sessão com psicóloga',
      eventTypeId: EVENT_TYPE.therapy,
      homeId: fe,
      start: at(0, '14:00'),
      end: at(0, '15:00'),
      participants: [[clara, PARTICIPATION.participant]],
    },
    {
      title: 'Reunião pedagógica',
      eventTypeId: EVENT_TYPE.meeting,
      homeId: esperanca,
      start: at(1, '10:00'),
      participants: [[caregiver, PARTICIPATION.organizer]],
    },
    {
      title: 'Passeio no parque',
      eventTypeId: EVENT_TYPE.activity,
      homeId: fe,
      start: at(2, '15:00'),
      end: at(2, '17:00'),
      participants: [
        [clara, PARTICIPATION.participant],
        [driver, PARTICIPATION.driver],
      ],
    },
    // A busy day, to see the "+N compromissos" on the desktop grid.
    ...[
      EVENT_TYPE.school,
      EVENT_TYPE.health,
      EVENT_TYPE.therapy,
      EVENT_TYPE.activity,
      EVENT_TYPE.other,
    ].map((eventTypeId, index): DemoEvent => ({
      title: `Compromisso ${String(index + 1)} do dia cheio`,
      eventTypeId,
      homeId: esperanca,
      start: at(7, `${String(8 + index).padStart(2, '0')}:00`),
    })),
    {
      title: 'Acampamento',
      eventTypeId: EVENT_TYPE.activity,
      homeId: fe,
      start: at(10, '18:00'),
      end: at(11, '12:00'),
    },
    {
      title: 'Exame de vista',
      eventTypeId: EVENT_TYPE.health,
      homeId: esperanca,
      start: at(-3, '13:30'),
      participants: [[lucas, PARTICIPATION.participant]],
    },
    {
      title: 'Vacinação',
      eventTypeId: EVENT_TYPE.health,
      homeId: esperanca,
      start: at(35, '09:00'),
    },
    // Soft-deleted: must not show up anywhere.
    {
      title: 'Compromisso removido',
      eventTypeId: EVENT_TYPE.health,
      homeId: fe,
      start: at(0, '11:00'),
      removed: true,
    },
  ];
  for (const event of events) await createEvent(event);

  console.log(
    [
      `Dados de demonstração criados: 2 casas, 6 pessoas e ${String(events.length)} compromissos.`,
      `Senha das contas: ${DEMO_PASSWORD}`,
      '  secretaria@ecos.test  (Secretário: as duas casas)',
      '  cuidadora@ecos.test   (Cuidador: só a Casa Esperança)',
      '  motorista@ecos.test   (Motorista: só os compromissos em que dirige)',
    ].join('\n'),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
