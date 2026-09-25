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
 * Validates body, params and query of a route and hands the controller typed data.
 *
 * The ZodError travels up to the errorHandler, which answers 400 with the issues, so
 * nothing is caught here.
 */
export class RequestValidator<S extends RequestSchemas> {
  constructor(private readonly schemas: S) {}

  readonly handle: RequestHandler = (req, res, next) => {
    const validated: Record<string, unknown> = {};

    if (this.schemas.body) {
      // req.body is writable; in Express 5 params and query only expose a getter.
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
   * Validated data of this request. Only valid in a handler that runs after
   * `handle` — the assertion stays confined here because `handle` is the only
   * place that writes this key.
   */
  data(res: Response): ValidatedData<S> {
    return (res.locals as Record<string, unknown>)[LOCALS_KEY] as ValidatedData<S>;
  }
}
