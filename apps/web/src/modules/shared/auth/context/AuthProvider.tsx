import { useCallback, useEffect, useMemo, useState } from 'react';

import type { LoginRequest } from '@casaecos/shared-types';

import { apiClient } from '../../../../shared/http/api-client.js';
import { authService } from '../services/auth-service.js';
import { sessionStore } from '../session-store.js';
import { AuthContext, type AuthState } from './auth-context.js';

interface AuthProviderProps {
  children: React.ReactNode;
}

function initialAuthState(): AuthState {
  return sessionStore.readAccessToken() === null
    ? { status: 'anonymous' }
    : { status: 'restoring' };
}

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [state, setState] = useState<AuthState>(initialAuthState);

  const logout = useCallback(() => {
    sessionStore.clear();
    setState({ status: 'anonymous' });
  }, []);

  // Any 401 on an authenticated call ends the session, wherever it came from.
  useEffect(() => apiClient.onUnauthorized(logout), [logout]);

  useEffect(() => {
    if (sessionStore.readAccessToken() === null) {
      return;
    }

    let unmounted = false;

    authService.getCurrentUser().then(
      (user) => {
        if (!unmounted) setState({ status: 'authenticated', user });
      },
      () => {
        // A 401 has already cleared the token through onUnauthorized. Any other
        // failure (offline, server down) keeps it, so the next reload can retry.
        if (!unmounted) setState({ status: 'anonymous' });
      },
    );

    return () => {
      unmounted = true;
    };
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    const { token, expiresInSeconds, user } = await authService.login(credentials);
    sessionStore.save({ token, expiresInSeconds });
    setState({ status: 'authenticated', user });
  }, []);

  const value = useMemo(() => ({ ...state, login, logout }), [state, login, logout]);

  return <AuthContext value={value}>{children}</AuthContext>;
}
