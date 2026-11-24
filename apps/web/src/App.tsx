import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { Typography } from '@mui/material';

import { AgendaPage } from './modules/agenda/pages/AgendaPage.js';
import { LoginPage } from './modules/shared/auth/pages/LoginPage.js';
import { ProtectedRoute } from './modules/shared/auth/routes/ProtectedRoute.js';
import { RequirePermission } from './modules/shared/auth/routes/RequirePermission.js';
import { AppLayout } from './modules/shared/layout/AppLayout.js';

const AccessPage = lazy(() =>
  import('./modules/shared/auth/pages/AccessPage.js').then((module) => ({
    default: module.AccessPage,
  })),
);

const HomeDetailPage = lazy(() =>
  import('./modules/shared/home/pages/HomeDetailPage.js').then((module) => ({
    default: module.HomeDetailPage,
  })),
);

const HomesPage = lazy(() =>
  import('./modules/shared/home/pages/HomesPage.js').then((module) => ({
    default: module.HomesPage,
  })),
);

const PeoplePage = lazy(() =>
  import('./modules/shared/person/pages/PeoplePage.js').then((module) => ({
    default: module.PeoplePage,
  })),
);

const SettingsLayout = lazy(() =>
  import('./modules/shared/settings/pages/SettingsLayout.js').then((module) => ({
    default: module.SettingsLayout,
  })),
);

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
                <Suspense fallback={<Typography role="status">Carregando...</Typography>}>
                  <SettingsLayout />
                </Suspense>
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
