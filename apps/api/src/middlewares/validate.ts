import type { RequestHandler, Response } from 'express';
import type { z } from 'zod';

export interface RequestSchemas {
  body?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
}

type ValidatedData<S extends RequestSchemas> = {
  [K in keyof S]: S[K] extends z.ZodType ? z.output<S[K]> : never;
};

const LOCALS_KEY = 'validated';

/**
 * Valida body, params e query de uma rota e devolve os dados já tipados ao controller.
 *
 * O ZodError sobe para o errorHandler, que responde 400 com as issues — por isso
 * o middleware não trata erro aqui.
 */
export class RequestValidator<S extends RequestSchemas> {
  constructor(private readonly schemas: S) {}

  readonly handle: RequestHandler = (req, res, next) => {
    const validated: Record<string, unknown> = {};

    if (this.schemas.body) {
      // req.body é gravável; params e query no Express 5 só expõem getter.
      req.body = this.schemas.body.parse(req.body);
      validated.body = req.body;
    }

    if (this.schemas.params) {
      validated.params = this.schemas.params.parse(req.params);
    }

    if (this.schemas.query) {
      validated.query = this.schemas.query.parse(req.query);
    }

    (res.locals as Record<string, unknown>)[LOCALS_KEY] = validated;
    next();
  };

  /**
   * Dados validados desta requisição. Só pode ser chamado em handler que roda
   * depois de `handle` — a asserção fica confinada aqui porque `handle` é o
   * único ponto que escreve essa chave.
   */
  data(res: Response): ValidatedData<S> {
    return (res.locals as Record<string, unknown>)[LOCALS_KEY] as ValidatedData<S>;
  }
}
