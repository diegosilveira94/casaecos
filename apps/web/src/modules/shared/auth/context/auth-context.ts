import { createContext } from 'react';

import type { AuthenticatedUserResponse, LoginRequest, Permission } from '@casaecos/shared-types';

/**
 * `restoring` covers the wait for `GET /auth/me` after a reload: the screen must not
 * send someone with a valid token to the login while it is still checking.
 */
export type AuthState =
  | { status: 'restoring' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: AuthenticatedUserResponse };

export type AuthContextValue = AuthState & {
  /** Rejects with `ApiRequestError`, whose message is ready for the login screen. */
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  /** False while the session is not authenticated. */
  can: (permission: Permission) => boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
