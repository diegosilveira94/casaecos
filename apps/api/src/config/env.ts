import { fileURLToPath } from 'node:url';

import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

// .env único, na raiz do monorepo.
loadEnv({ path: fileURLToPath(new URL('../../../../.env', import.meta.url)) });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Segredo de assinatura do JWT: nunca no código. 32 caracteres é o mínimo para
  // HS256 não ficar mais fraco que o próprio algoritmo.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa de ao menos 32 caracteres'),
  // Em segundos: cobre um turno de trabalho (8h). Sem refresh token nesta fase,
  // expirar antes disso jogaria a cuidadora para a tela de login no meio do plantão.
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(28_800),
  // Tentativas de login por IP na janela do rate limit.
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
