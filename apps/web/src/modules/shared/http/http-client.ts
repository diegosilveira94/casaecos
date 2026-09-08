import { tokenStorage } from '../auth/token-storage.js';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  authenticated?: boolean;
  body?: unknown;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export class HttpClient {
  private unauthorizedHandler: (() => void) | undefined;

  constructor(private readonly baseUrl: string) {}

  setUnauthorizedHandler(handler: (() => void) | undefined): void {
    this.unauthorizedHandler = handler;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { authenticated = true, body, headers: customHeaders, ...requestInit } = options;
    const headers = new Headers(customHeaders);

    headers.set('Accept', 'application/json');

    if (body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }

    const token = tokenStorage.get();

    if (authenticated && token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...requestInit,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      headers,
    });

    if (!response.ok) {
      if (response.status === 401 && authenticated) {
        tokenStorage.remove();
        this.unauthorizedHandler?.();
      }

      throw new ApiRequestError(await this.getErrorMessage(response), response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  private async getErrorMessage(response: Response): Promise<string> {
    try {
      const body: unknown = await response.json();

      if (
        typeof body === 'object' &&
        body !== null &&
        'message' in body &&
        typeof body.message === 'string'
      ) {
        return body.message;
      }

      return 'Não foi possível concluir a solicitação.';
    } catch {
      return 'Não foi possível concluir a solicitação.';
    }
  }
}

const environment = import.meta.env as { readonly VITE_API_URL?: string };
const apiUrl = environment.VITE_API_URL ?? 'http://localhost:3333';

export const httpClient = new HttpClient(apiUrl);
