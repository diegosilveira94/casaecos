import { Prisma } from '../generated/prisma/client.js';
import { HttpError } from '../middlewares/http-error.js';

// Nomes de coluna do banco traduzidos para o vocabulário da tela.
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
 * Colunas do índice único violado no P2002.
 *
 * Com o driver adapter do Prisma 7 o `meta.target` não vem preenchido: o que chega é
 * `meta.driverAdapterError.cause.constraint.index` com o nome da constraint do
 * Postgres (ex: `user_account_person_id_key`). Daí a coluna sai tirando o prefixo da
 * tabela e o sufixo `_key`. O caminho do `target` fica por primeiro para o dia em que
 * o Prisma voltar a preenchê-lo.
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

// Só descreve o que tem tradução: nome cru de constraint na tela não ajuda ninguém.
function describeColumns(columns: string[]): string | null {
  const labels = columns
    .map((column) => FIELD_LABELS[column])
    .filter((label) => label !== undefined);

  return labels.length > 0 ? labels.join(', ') : null;
}

/**
 * Traduz erro do Prisma para HttpError com mensagem em português.
 *
 * Devolve `null` quando o erro não é do Prisma ou não tem tradução conhecida —
 * nesse caso o errorHandler registra no log e responde 500, porque erro sem
 * tradução é defeito nosso, não erro do usuário.
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
    // Vale para os dois sentidos: FK apontando para registro inexistente e
    // remoção de lookup ainda em uso. O service deve barrar antes e dar uma
    // mensagem precisa; isto aqui é a rede de segurança.
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
