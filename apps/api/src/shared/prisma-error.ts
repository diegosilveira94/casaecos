import { Prisma } from '../generated/prisma/client.js';
import { HttpError } from '../middlewares/http-error.js';

// Database column names translated into the vocabulary of the screen.
const FIELD_LABELS: Record<string, string> = {
  email: 'e-mail',
  name: 'nome',
  label: 'rótulo',
  title: 'título',
  phone: 'telefone',
  person_id: 'pessoa',
};

function toColumnList(target: unknown): string[] {
  if (Array.isArray(target))
    return target.filter((item): item is string => typeof item === 'string');
  return typeof target === 'string' ? [target] : [];
}

function readString(source: unknown, key: string): string | null {
  if (typeof source !== 'object' || source === null) return null;
  const value: unknown = (source as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}

function readObject(source: unknown, key: string): unknown {
  if (typeof source !== 'object' || source === null) return null;
  return (source as Record<string, unknown>)[key];
}

/**
 * Columns of the unique index violated by a P2002.
 *
 * With the Prisma 7 driver adapter `meta.target` is never filled: what arrives is
 * `meta.driverAdapterError.cause.constraint.index`, the Postgres constraint name
 * (e.g. `user_account_person_id_key`), so the column comes from stripping the table
 * prefix and the `_key` suffix. The `target` path is tried first, for the day Prisma
 * starts filling it again.
 */
export function uniqueConstraintColumns(error: unknown): string[] | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return null;
  }

  const fromTarget = toColumnList(error.meta?.target);
  if (fromTarget.length > 0) return fromTarget;

  const cause = readObject(readObject(error.meta, 'driverAdapterError'), 'cause');
  const index = readString(readObject(cause, 'constraint'), 'index');
  const fields = toColumnList(readObject(readObject(cause, 'constraint'), 'fields'));
  if (fields.length > 0) return fields;
  if (index === null) return [];

  const table = readString(cause, 'table');
  const withoutTable =
    table !== null && index.startsWith(`${table}_`) ? index.slice(table.length + 1) : index;

  return [withoutTable.replace(/_key$/, '')];
}

// Only what has a translation: a raw constraint name on screen helps nobody.
function describeColumns(columns: string[]): string | null {
  const labels = columns
    .map((column) => FIELD_LABELS[column])
    .filter((label) => label !== undefined);

  return labels.length > 0 ? labels.join(', ') : null;
}

/**
 * Translates a Prisma error into an HttpError carrying a message in Portuguese.
 *
 * Returns `null` when the error is not from Prisma or has no known translation. The
 * errorHandler then logs it and answers 500, because an untranslated error is a
 * defect of ours, not something the user can fix.
 */
export function toHttpError(error: unknown): HttpError | null {
  if (error instanceof Prisma.PrismaClientValidationError) {
    return HttpError.badRequest('Dados inválidos para esta operação');
  }

  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null;

  switch (error.code) {
    case 'P2000': {
      return HttpError.badRequest('Valor maior que o tamanho permitido para o campo');
    }
    case 'P2002': {
      const target = describeColumns(uniqueConstraintColumns(error) ?? []);
      return HttpError.conflict(
        target
          ? `Já existe um registro com este ${target}`
          : 'Já existe um registro com estes dados',
      );
    }
    // Covers both directions: a FK pointing at a missing row, and removing a lookup
    // still in use. The service should catch it earlier with a precise message; this
    // is the safety net.
    case 'P2003': {
      return HttpError.badRequest('Referência inválida entre registros');
    }
    case 'P2025': {
      return HttpError.notFound('Recurso não encontrado');
    }
    default: {
      return null;
    }
  }
}
