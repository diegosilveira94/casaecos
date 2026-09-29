import { use } from 'react';

import { AuthContext, type AuthContextValue } from './auth-context.js';

export function useAuth(): AuthContextValue {
  const auth = use(AuthContext);

  if (!auth) {
    throw new Error('useAuth precisa ser usado dentro de <AuthProvider>');
  }

  return auth;
}
