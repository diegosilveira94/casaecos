import { z } from 'zod';

import { prisma } from '../src/config/prisma.js';
import { ROLE_IDS } from '../src/modules/shared/person/domain/role-ids.js';
import { BcryptPasswordHasher } from '../src/modules/shared/auth/services/password-hasher.js';
import { PASSWORD_MIN_LENGTH } from '../src/modules/shared/auth/services/password-hasher.js';

/**
 * Cria o primeiro coordenador com credencial de acesso.
 *
 * Existe porque `POST /auth/accounts` exige token de Coordenador: sem um usuário
 * inicial criado fora da API, ninguém consegue criar o primeiro. Rodar de novo não
 * sobrescreve nada — se já existe conta com o e-mail informado, o script avisa e sai
 * sem tocar na senha.
 */
const adminSchema = z.object({
  ADMIN_NAME: z.string().trim().min(1).max(45).default('Coordenação'),
  ADMIN_EMAIL: z.string().trim().pipe(z.email().max(255)),
  ADMIN_PASSWORD: z.string().min(PASSWORD_MIN_LENGTH),
});

async function main(): Promise<void> {
  const parsed = adminSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Defina ADMIN_EMAIL e ADMIN_PASSWORD no .env:\n${issues}`);
  }

  const email = parsed.data.ADMIN_EMAIL.toLowerCase();

  const existing = await prisma.userAccount.findUnique({
    where: { email },
    select: { personId: true },
  });

  if (existing) {
    console.log(
      `Já existe credencial para ${email} (person ${String(existing.personId)}). Nada a fazer.`,
    );
    return;
  }

  const passwordHash = await new BcryptPasswordHasher().hash(parsed.data.ADMIN_PASSWORD);

  const account = await prisma.userAccount.create({
    data: {
      email,
      passwordHash,
      person: { create: { name: parsed.data.ADMIN_NAME, roleId: ROLE_IDS.coordinator } },
    },
    select: { id: true, personId: true },
  });

  console.log(
    `Coordenador criado: ${email} (person ${String(account.personId)}, conta ${String(account.id)}).`,
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
