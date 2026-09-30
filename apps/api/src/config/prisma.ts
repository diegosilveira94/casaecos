import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';
import { env } from './env.js';

// Only repositories import this: services and controllers never talk to Prisma.
// The session runs in UTC whatever the server says: under any other time zone the pg
// adapter drops the offset of timestamptz, shifting every stored, read and filtered
// date by that zone's offset (decision #80).
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL, options: '-c timezone=UTC' });

export const prisma = new PrismaClient({ adapter });
