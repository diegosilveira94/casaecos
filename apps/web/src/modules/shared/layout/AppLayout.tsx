import { useCallback, useState } from 'react';
import { Outlet } from 'react-router';

import { useIsDesktop } from '../../../shared/ui/use-media-query.js';
import { HomeSelectionProvider } from '../home/context/HomeSelectionProvider.js';
import { AppHeader } from './AppHeader.js';
import { AppSidebar } from './AppSidebar.js';

/**
 * Frame of the logged-in screens. The menu button collapses the sidebar on the
 * desktop and opens it as a drawer on the phone, where it starts closed.
 */
export function AppLayout(): React.JSX.Element {
  const isDesktop = useIsDesktop();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const toggleMenu = (): void => {
    if (isDesktop) setIsSidebarCollapsed((current) => !current);
    else setIsDrawerOpen((current) => !current);
  };

  const shellClassName = [
    'app-shell',
    isSidebarCollapsed ? 'is-sidebar-collapsed' : '',
    isDrawerOpen ? 'is-drawer-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <HomeSelectionProvider>
      <div className={shellClassName}>
        <AppSidebar onNavigate={closeDrawer} />
        {isDrawerOpen ? (
          <div className="app-shell__backdrop" aria-hidden="true" onClick={closeDrawer} />
        ) : null}
        <div className="app-shell__content">
          <AppHeader
            isMenuOpen={isDesktop ? !isSidebarCollapsed : isDrawerOpen}
            onToggleMenu={toggleMenu}
          />
          <Outlet />
          <footer className="app-footer">
            © {new Date().getFullYear()} Casa Ecos. Todos os direitos reservados.
          </footer>
        </div>
      </div>
    </HomeSelectionProvider>
  );
}
