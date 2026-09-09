import { prisma } from '../../../../config/prisma.js';

export interface AuthenticatedAccount {
  accountId: number;
  passwordHash: string;
  personId: number;
  role: string;
}

export interface PersonCredentialStatus {
  personId: number;
  hasCredential: boolean;
}

export interface CreatedCredential {
  id: number;
  personId: number;
  email: string;
}

export interface AuthRepository {
  findAccountByEmail(email: string): Promise<AuthenticatedAccount | null>;
  updateLastLogin(accountId: number, date: Date): Promise<void>;
  emailExists(email: string): Promise<boolean>;
  findPersonCredentialStatus(personId: number): Promise<PersonCredentialStatus | null>;
  createCredential(
    personId: number,
    email: string,
    passwordHash: string,
  ): Promise<CreatedCredential>;
}

export class PrismaAuthRepository implements AuthRepository {
  async findAccountByEmail(email: string): Promise<AuthenticatedAccount | null> {
    const account = await prisma.userAccount.findUnique({
      where: { email },
      select: {
        id: true,
        passwordHash: true,
        person: {
          select: {
            id: true,
            role: { select: { description: true } },
          },
        },
      },
    });

    if (!account) {
      return null;
    }

    return {
      accountId: account.id,
      passwordHash: account.passwordHash,
      personId: account.person.id,
      role: account.person.role.description,
    };
  }

  async updateLastLogin(accountId: number, date: Date): Promise<void> {
    await prisma.userAccount.update({
      where: { id: accountId },
      data: { lastLoginAt: date },
    });
  }

  async emailExists(email: string): Promise<boolean> {
    const account = await prisma.userAccount.findUnique({
      where: { email },
      select: { id: true },
    });

    return account !== null;
  }

  async findPersonCredentialStatus(personId: number): Promise<PersonCredentialStatus | null> {
    const person = await prisma.person.findUnique({
      where: { id: personId },
      select: {
        id: true,
        userAccount: { select: { id: true } },
      },
    });

    if (!person) {
      return null;
    }

    return {
      personId: person.id,
      hasCredential: person.userAccount !== null,
    };
  }

  async createCredential(
    personId: number,
    email: string,
    passwordHash: string,
  ): Promise<CreatedCredential> {
    return prisma.userAccount.create({
      data: { personId, email, passwordHash },
      select: { id: true, personId: true, email: true },
    });
  }
}
