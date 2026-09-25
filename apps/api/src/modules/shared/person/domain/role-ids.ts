/**
 * Ids of the roles seeded by `prisma/seed.ts`. They are stable across environments by
 * decision (#37: upsert on a fixed id followed by `setval`), which is what allows
 * referring to them from the code instead of querying the lookup by description.
 */
export const ROLE_IDS = {
  coordinator: 1,
  secretary: 2,
  caregiver: 3,
  driver: 4,
  sheltered: 5,
} as const;
