import type { Prisma } from '../../../../generated/prisma/client.js';
import { Person, Role } from '../domain/person.js';

/** What every repository reads to build a `Person`, so they all answer the same shape. */
export const personSelection = {
  id: true,
  name: true,
  individualRegistration: true,
  phone: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { id: true, description: true } },
  userAccount: { select: { id: true } },
} satisfies Prisma.PersonSelect;

export type PersonRecord = Prisma.PersonGetPayload<{ select: typeof personSelection }>;

export function toPerson(record: PersonRecord): Person {
  return new Person({
    id: record.id,
    name: record.name,
    role: new Role(record.role.id, record.role.description),
    individualRegistration: record.individualRegistration,
    phone: record.phone,
    hasAccount: record.userAccount !== null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}
