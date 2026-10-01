import { Navigate, Route, Routes } from 'react-router';

import { AgendaPage } from './modules/agenda/pages/AgendaPage.js';
import { LoginPage } from './modules/shared/auth/pages/LoginPage.js';
import { ProtectedRoute } from './modules/shared/auth/routes/ProtectedRoute.js';

export function App(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/agenda" element={<AgendaPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/agenda" replace />} />
    </Routes>
  );
}
