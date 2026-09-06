import { prisma } from '../src/config/prisma.js';

// Conteúdo de domínio: fica em português porque é o que a ONG vê na tela.
const roles = ['Coordenador', 'Secretário', 'Cuidador/Monitor', 'Motorista', 'Acolhido'];

const eventTypes = [
  'Consulta médica',
  'Escola',
  'Terapia',
  'Atividade/passeio',
  'Reunião',
  'Outro',
];

const participationTypes = ['Organizador', 'Participante', 'Responsável', 'Motorista'];

// id fixo pela posição na lista: o seed é reexecutável e os ids ficam estáveis
// entre ambientes, o que importa porque outras tabelas referenciam esses lookups.
async function seedLookups(): Promise<void> {
  await prisma.$transaction([
    ...roles.map((description, index) =>
      prisma.role.upsert({
        where: { id: index + 1 },
        update: { description },
        create: { id: index + 1, description },
      }),
    ),
    ...eventTypes.map((name, index) =>
      prisma.eventType.upsert({
        where: { id: index + 1 },
        update: { name },
        create: { id: index + 1, name },
      }),
    ),
    ...participationTypes.map((description, index) =>
      prisma.participationType.upsert({
        where: { id: index + 1 },
        update: { description },
        create: { id: index + 1, description },
      }),
    ),
  ]);
}

// Upsert com id explícito não move a sequence do Postgres; sem isto o primeiro
// insert sem id colidiria com as linhas do seed.
async function syncLookupSequences(): Promise<void> {
  for (const table of ['role', 'event_type', 'participation_type']) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1))`,
    );
  }
}

async function main(): Promise<void> {
  await seedLookups();
  await syncLookupSequences();

  console.log(
    `Seed concluído: ${String(roles.length)} roles, ${String(eventTypes.length)} event types, ${String(participationTypes.length)} participation types.`,
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
