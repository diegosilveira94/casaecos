import { use } from 'react';

import { AuthContext, type AuthContextValue } from './auth-context.js';

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
}
