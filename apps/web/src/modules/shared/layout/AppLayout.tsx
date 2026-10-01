import { Outlet } from 'react-router';

import { AppHeader } from './AppHeader.js';
import { AppSidebar } from './AppSidebar.js';

/** Frame of the logged-in screens: sidebar on the desktop, top bar, and the page. */
export function AppLayout(): React.JSX.Element {
  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-shell__content">
        <AppHeader />
        <Outlet />
      </div>
    </div>
  );
}
