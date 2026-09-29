import type { LoginResponse } from '@casaecos/shared-types';

import type { AccessTokenSource } from '../../../shared/http/http-client.js';

const STORAGE_KEY = 'casaecos.session';

interface StoredSession {
  token: string;
  /** Epoch milliseconds. */
  expiresAt: number;
}

/**
 * Keeps the token across page reloads: with no refresh token (decision #46), losing
 * it on every reload would send the caregiver back to the login mid-shift.
 *
 * Only the token and its expiry are stored. The user comes back from `GET /auth/me`,
 * so a role changed by the coordinator shows up on the next reload.
 */
export class SessionStore implements AccessTokenSource {
  constructor(private readonly storage: Storage) {}

  save({ token, expiresInSeconds }: Pick<LoginResponse, 'token' | 'expiresInSeconds'>): void {
    const session: StoredSession = { token, expiresAt: Date.now() + expiresInSeconds * 1000 };
    this.storage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  /** Drops an expired token instead of sending it for the API to reject. */
  readAccessToken(): string | null {
    const session = this.read();

    if (session && session.expiresAt <= Date.now()) {
      this.clear();
      return null;
    }

    return session?.token ?? null;
  }

  clear(): void {
    this.storage.removeItem(STORAGE_KEY);
  }

  // The storage is editable by hand in the browser, so its content is not trusted.
  private read(): StoredSession | null {
    const raw = this.storage.getItem(STORAGE_KEY);

    if (raw === null) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      return isStoredSession(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}

function isStoredSession(value: unknown): value is StoredSession {
  return (
    typeof value === 'object' &&
    value !== null &&
    'token' in value &&
    typeof value.token === 'string' &&
    'expiresAt' in value &&
    typeof value.expiresAt === 'number'
  );
}

export const sessionStore = new SessionStore(window.localStorage);
