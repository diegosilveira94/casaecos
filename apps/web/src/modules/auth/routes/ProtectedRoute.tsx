import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../context/use-auth.js';

export function ProtectedRoute(): React.JSX.Element {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
