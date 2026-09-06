export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static badRequest(message: string, details?: unknown): HttpError {
    return new HttpError(400, message, details);
  }

  static unauthorized(message = 'Não autenticado'): HttpError {
    return new HttpError(401, message);
  }

  static forbidden(message = 'Sem permissão'): HttpError {
    return new HttpError(403, message);
  }

  static notFound(message = 'Recurso não encontrado'): HttpError {
    return new HttpError(404, message);
  }

  static conflict(message: string, details?: unknown): HttpError {
    return new HttpError(409, message, details);
  }
}
