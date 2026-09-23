import { prisma } from '../../../../config/prisma.js';
import type { Prisma } from '../../../../generated/prisma/client.js';
import { uniqueConstraintColumns } from '../../../../shared/prisma-error.js';
import { Role } from '../../person/domain/person.js';
import { UserAccount } from '../domain/user-account.js';

export interface CreateUserAccountData {
  personId: number;
  email: string;
  passwordHash: string;
}

export interface UserAccountRepository {
  findByEmail(email: string): Promise<UserAccount | null>;
  findByPersonId(personId: number): Promise<UserAccount | null>;
  personExists(personId: number): Promise<boolean>;
  create(data: CreateUserAccountData): Promise<UserAccount>;
  registerLogin(id: number, at: Date): Promise<void>;
}

export class DuplicateEmailError extends Error {
  constructor() {
    super('Email already in use');
    this.name = 'DuplicateEmailError';
  }
}

export class PersonAlreadyHasAccountError extends Error {
  constructor() {
    super('Person already has an account');
    this.name = 'PersonAlreadyHasAccountError';
  }
}

const userAccountSelection = {
  id: true,
  personId: true,
  email: true,
  passwordHash: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  person: { select: { name: true, role: { select: { id: true, description: true } } } },
} satisfies Prisma.UserAccountSelect;

type UserAccountRecord = Prisma.UserAccountGetPayload<{ select: typeof userAccountSelection }>;

function toUserAccount(record: UserAccountRecord): UserAccount {
  return new UserAccount({
    id: record.id,
    personId: record.personId,
    personName: record.person.name,
    email: record.email,
    passwordHash: record.passwordHash,
    role: new Role(record.person.role.id, record.person.role.description),
    lastLoginAt: record.lastLoginAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export class PrismaUserAccountRepository implements UserAccountRepository {
  async findByEmail(email: string): Promise<UserAccount | null> {
    const account = await prisma.userAccount.findUnique({
      where: { email },
      select: userAccountSelection,
    });

    return account ? toUserAccount(account) : null;
  }

  async findByPersonId(personId: number): Promise<UserAccount | null> {
    const account = await prisma.userAccount.findUnique({
      where: { personId },
      select: userAccountSelection,
    });

    return account ? toUserAccount(account) : null;
  }

  async personExists(personId: number): Promise<boolean> {
    const person = await prisma.person.findUnique({
      where: { id: personId },
      select: { id: true },
    });

    return person !== null;
  }

  async create(data: CreateUserAccountData): Promise<UserAccount> {
    try {
      const account = await prisma.userAccount.create({ data, select: userAccountSelection });
      return toUserAccount(account);
    } catch (error: unknown) {
      const columns = uniqueConstraintColumns(error);
      if (columns) {
        // O 1:1 com person (decisão #20) e o e-mail único são dois conflitos
        // diferentes, e a tela precisa de mensagens diferentes para cada um.
        throw columns.includes('person_id')
          ? new PersonAlreadyHasAccountError()
          : new DuplicateEmailError();
      }
      throw error;
    }
  }

  async registerLogin(id: number, at: Date): Promise<void> {
    await prisma.userAccount.update({ where: { id }, data: { lastLoginAt: at } });
  }
}
