/**
 * Ids dos papéis semeados em `prisma/seed.ts`. São estáveis entre ambientes por
 * decisão (#37: upsert por id fixo seguido de `setval`), e é isso que permite
 * referenciá-los no código em vez de consultar o lookup por descrição.
 */
export const ROLE_IDS = {
  coordinator: 1,
  secretary: 2,
  caregiver: 3,
  driver: 4,
  sheltered: 5,
} as const;
