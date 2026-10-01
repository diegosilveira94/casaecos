import { Navigate, Outlet, useLocation } from 'react-router';

import { SessionRestoring } from '../components/SessionRestoring.js';
import { useAuth } from '../context/use-auth.js';

/**
 * Waits for `GET /auth/me` while the session is `restoring`: redirecting right away
 * would send someone with a valid token to the login on every page reload.
 */
export function ProtectedRoute(): React.JSX.Element {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'restoring') return <SessionRestoring />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />;
}
