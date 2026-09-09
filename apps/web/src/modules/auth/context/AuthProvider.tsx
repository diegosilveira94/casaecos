import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { LoginRequest } from '@casaecos/shared-types';

import { tokenStorage } from '../../shared/auth/token-storage.js';
import { httpClient } from '../../shared/http/http-client.js';
import { authService } from '../services/auth-service.js';
import { AuthContext } from './auth-context.js';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() => tokenStorage.get());

  const logout = useCallback(() => {
    tokenStorage.remove();
    setToken(null);
    void navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    httpClient.setUnauthorizedHandler(logout);

    return () => {
      httpClient.setUnauthorizedHandler(undefined);
    };
  }, [logout]);

  const login = useCallback(async (credentials: LoginRequest) => {
    const response = await authService.login(credentials);
    tokenStorage.set(response.token);
    setToken(response.token);
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated: token !== null, login, logout }),
    [login, logout, token],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
