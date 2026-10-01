import { fileURLToPath } from 'node:url';

import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

// Single .env, at the root of the monorepo.
loadEnv({ path: fileURLToPath(new URL('../../../../.env', import.meta.url)) });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // JWT signing secret, never in the code. 32 characters is the minimum for HS256
  // not to be weaker than the algorithm itself.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa de ao menos 32 caracteres'),
  // In seconds: covers a work shift (8h). With no refresh token in this phase,
  // expiring sooner would throw the caregiver back to the login screen mid-shift.
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(28_800),
  // Login attempts per IP inside the rate limit window.
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(10),
  LOGIN_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
}

export const env = parsed.data;
export type Env = typeof env;
