import { Box, Typography } from '@mui/material';
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

  return (
    <HomeSelectionProvider>
      <Box
        sx={{
          minHeight: '100dvh',
          bgcolor: 'background.default',
          display: { md: 'grid' },
          gridTemplateColumns: {
            md: isSidebarCollapsed ? 'minmax(0, 1fr)' : '14.25rem minmax(0, 1fr)',
          },
        }}
      >
        <AppSidebar
          isDrawerOpen={isDrawerOpen}
          isCollapsed={isSidebarCollapsed}
          onCloseDrawer={closeDrawer}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100dvh' }}>
          <AppHeader
            isMenuOpen={isDesktop ? !isSidebarCollapsed : isDrawerOpen}
            onToggleMenu={toggleMenu}
          />
          <Outlet />
          <Typography
            component="footer"
            variant="caption"
            sx={{ color: 'text.secondary', mt: 'auto', px: { xs: 2, md: 4.5 }, py: 2 }}
          >
            © {new Date().getFullYear()} Casa Ecos. Todos os direitos reservados.
          </Typography>
        </Box>
      </Box>
    </HomeSelectionProvider>
  );
}
