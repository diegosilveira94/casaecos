import { Navigate, Route, Routes } from 'react-router';

import { AgendaPage } from './modules/agenda/pages/AgendaPage.js';
import { LoginPage } from './modules/shared/auth/pages/LoginPage.js';
import { AccessPage } from './modules/shared/auth/pages/AccessPage.js';
import { ProtectedRoute } from './modules/shared/auth/routes/ProtectedRoute.js';
import { RequirePermission } from './modules/shared/auth/routes/RequirePermission.js';
import { HomeDetailPage } from './modules/shared/home/pages/HomeDetailPage.js';
import { HomesPage } from './modules/shared/home/pages/HomesPage.js';
import { AppLayout } from './modules/shared/layout/AppLayout.js';
import { PeoplePage } from './modules/shared/person/pages/PeoplePage.js';
import { SettingsLayout } from './modules/shared/settings/pages/SettingsLayout.js';

export function App(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/agenda" element={<AgendaPage />} />
          <Route
            path="/settings"
            element={
              <RequirePermission permission="person:read">
                <SettingsLayout />
              </RequirePermission>
            }
          >
            <Route index element={<Navigate to="people" replace />} />
            <Route path="people" element={<PeoplePage />} />
            <Route
              path="homes"
              element={
                <RequirePermission permission="home:read">
                  <HomesPage />
                </RequirePermission>
              }
            />
            <Route
              path="homes/:homeId"
              element={
                <RequirePermission permission="home:read">
                  <HomeDetailPage />
                </RequirePermission>
              }
            />
            <Route
              path="access"
              element={
                <RequirePermission permission="account:manage">
                  <AccessPage />
                </RequirePermission>
              }
            />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/agenda" replace />} />
    </Routes>
  );
}
