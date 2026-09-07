import { Prisma } from '../generated/prisma/client.js';
import { HttpError } from '../middlewares/http-error.js';

// Nomes de coluna do banco traduzidos para o vocabulário da tela.
const FIELD_LABELS: Record<string, string> = {
  email: 'e-mail',
  name: 'nome',
  label: 'rótulo',
  title: 'título',
};

function describeTarget(target: unknown): string | null {
  const columns = Array.isArray(target)
    ? target.filter((item): item is string => typeof item === 'string')
    : typeof target === 'string'
      ? [target]
      : [];

  if (columns.length === 0) return null;

  return columns.map((column) => FIELD_LABELS[column] ?? column).join(', ');
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
      const target = describeTarget(error.meta?.target);
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
