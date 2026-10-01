import type { ApiError } from '@casaecos/shared-types';

import { ApiRequestError } from './api-request-error.js';

const UNREACHABLE_API_MESSAGE =
  'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
const UNEXPECTED_RESPONSE_MESSAGE = 'Não foi possível concluir a solicitação.';

/** Where the token comes from; the auth module decides how it is stored. */
export interface AccessTokenSource {
  readAccessToken(): string | null;
}

interface RequestOptions {
  /**
   * `false` for calls made before there is a session, such as the login: no token
   * is sent, and a 401 means a wrong password, not an expired session.
   */
  authenticated?: boolean;
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type UnauthorizedListener = () => void;

/**
 * The only way the screens talk to the API: services call it, components never
 * call `fetch` directly.
 */
export class HttpClient {
  private readonly unauthorizedListeners = new Set<UnauthorizedListener>();

  constructor(
    private readonly baseUrl: string,
    private readonly tokenSource: AccessTokenSource,
  ) {}

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request('GET', path, undefined, options);
  }

  post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.request('POST', path, body, options);
  }

  patch<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.request('PATCH', path, body, options);
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request('DELETE', path, undefined, options);
  }

  /**
   * Called whenever the API rejects the token, so the session ends in one place.
   * Returns the unsubscribe function, ready to be the cleanup of a React effect.
   */
  onUnauthorized(listener: UnauthorizedListener): () => void {
    this.unauthorizedListeners.add(listener);
    return () => this.unauthorizedListeners.delete(listener);
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    body: unknown,
    { authenticated = true }: RequestOptions = {},
  ): Promise<T> {
    const response = await this.send(method, path, body, authenticated);

    if (!response.ok) {
      if (response.status === 401 && authenticated) {
        this.notifyUnauthorized();
      }

      throw new ApiRequestError(response.status, await this.readApiError(response));
    }

    // The contract lives in shared-types and the API is trusted to honour it:
    // the response is typed here, not validated at runtime.
    return (await response.json()) as T;
  }

  private async send(
    method: HttpMethod,
    path: string,
    body: unknown,
    authenticated: boolean,
  ): Promise<Response> {
    try {
      return await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: this.buildHeaders(body, authenticated),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      // fetch only rejects when no response arrived at all.
      throw new ApiRequestError(null, { message: UNREACHABLE_API_MESSAGE });
    }
  }

  private buildHeaders(body: unknown, authenticated: boolean): Headers {
    const headers = new Headers({ Accept: 'application/json' });

    if (body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }

    const token = authenticated ? this.tokenSource.readAccessToken() : null;

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  // A proxy or the hosting platform can answer with HTML instead of an ApiError.
  private async readApiError(response: Response): Promise<ApiError> {
    try {
      const body: unknown = await response.json();

      if (isApiError(body)) {
        return body;
      }
    } catch {
      // Not JSON: falls through to the generic message.
    }

    return { message: UNEXPECTED_RESPONSE_MESSAGE };
  }

  private notifyUnauthorized(): void {
    for (const listener of this.unauthorizedListeners) {
      listener();
    }
  }
}

function isApiError(body: unknown): body is ApiError {
  return (
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof body.message === 'string'
  );
}
