import { createContext } from 'react';

import type { LoginCredentials } from '../services/auth-service.js';

export interface AuthContextValue {
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
