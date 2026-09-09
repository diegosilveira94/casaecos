import { createContext } from 'react';

import type { LoginRequest } from '@casaecos/shared-types';

export interface AuthContextValue {
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
