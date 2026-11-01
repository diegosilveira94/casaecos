import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { NavLink } from 'react-router';

import landscapeUrl from '../../../assets/sidebar-landscape.png';
import { COMING_SOON_PROPS } from '../../../shared/ui/coming-soon.js';
import {
  CalendarIcon,
  ChartIcon,
  DollarIcon,
  GearIcon,
  HelpIcon,
  PillIcon,
} from '../../../shared/ui/icons.js';
import { useIsDesktop } from '../../../shared/ui/use-media-query.js';
import { useAuth } from '../auth/context/use-auth.js';
import { AppBrand } from './AppBrand.js';
import { HomePicker } from './HomePicker.js';

// Shown as in the prototype; they become links as each module ships.
const UPCOMING_MODULES = [
  { label: 'Medicamentos', icon: <PillIcon /> },
  { label: 'Relatórios', icon: <ChartIcon /> },
  { label: 'Prestação de Contas', icon: <DollarIcon /> },
];

const SIDEBAR_ID = 'app-sidebar';
const MODULE_SX = { borderRadius: '0 1.5rem 1.5rem 0' };
const ICON_SX = { minWidth: '2.5rem' };
const CURRENT_LINK_SX = {
  ...MODULE_SX,
  '&[aria-current="page"]': {
    bgcolor: 'primary.light',
    color: 'primary.main',
    fontWeight: 600,
    '& .MuiListItemIcon-root': { color: 'primary.main' },
  },
};

interface ModuleLinkProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  onNavigate: () => void;
}

function ModuleLink({ to, label, icon, onNavigate }: ModuleLinkProps): React.JSX.Element {
  return (
    <ListItemButton component={NavLink} to={to} onClick={onNavigate} sx={CURRENT_LINK_SX}>
      <ListItemIcon sx={ICON_SX}>{icon}</ListItemIcon>
      <ListItemText primary={label} />
    </ListItemButton>
  );
}

interface UpcomingModuleProps {
  label: string;
  icon: React.ReactNode;
}

function UpcomingModule({ label, icon }: UpcomingModuleProps): React.JSX.Element {
  return (
    <ListItemButton
      component="button"
      {...COMING_SOON_PROPS}
      sx={{ ...MODULE_SX, width: '100%', opacity: 0.45 }}
    >
      <ListItemIcon sx={ICON_SX}>{icon}</ListItemIcon>
      <ListItemText primary={label} />
    </ListItemButton>
  );
}

function SidebarContent({ onNavigate }: { onNavigate: () => void }): React.JSX.Element {
  const { can } = useAuth();

  return (
    <>
      <AppBrand layout="stacked" />

      <List component="nav" aria-label="Módulos" sx={{ mt: 3, pr: 1 }}>
        <ModuleLink to="/agenda" label="Agenda" icon={<CalendarIcon />} onNavigate={onNavigate} />
        {UPCOMING_MODULES.map(({ label, icon }) => (
          <UpcomingModule key={label} label={label} icon={icon} />
        ))}
        {/* The registers are the coordination's: the other roles do not see them. */}
        {can('person:read') ? (
          <ModuleLink
            to="/settings"
            label="Configurações"
            icon={<GearIcon />}
            onNavigate={onNavigate}
          />
        ) : null}
        <UpcomingModule label="Ajuda" icon={<HelpIcon />} />
      </List>

      <Stack spacing={2.5} sx={{ mt: 'auto', px: 2, pt: 4, pb: 3 }}>
        <HomePicker />
        <Typography color="primary" variant="body2" sx={{ px: 1 }}>
          Cuidando de quem cuida.
        </Typography>
      </Stack>

      <Box
        component="img"
        src={landscapeUrl}
        alt=""
        width={228}
        height={161}
        sx={{ display: 'block', width: '100%', height: 'auto' }}
      />
    </>
  );
}

interface AppSidebarProps {
  /** Phone: the sidebar is a drawer behind the menu button. */
  isDrawerOpen: boolean;
  /** Desktop: the menu button hides it. */
  isCollapsed: boolean;
  onCloseDrawer: () => void;
}

export function AppSidebar({
  isDrawerOpen,
  isCollapsed,
  onCloseDrawer,
}: AppSidebarProps): React.JSX.Element | null {
  const isDesktop = useIsDesktop();

  if (!isDesktop) {
    return (
      <Drawer
        open={isDrawerOpen}
        onClose={onCloseDrawer}
        slotProps={{ paper: { id: SIDEBAR_ID, sx: { width: 'min(17rem, 85vw)', pt: 3 } } }}
      >
        <SidebarContent onNavigate={onCloseDrawer} />
      </Drawer>
    );
  }

  if (isCollapsed) return null;

  return (
    <Box
      component="aside"
      id={SIDEBAR_ID}
      sx={{
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        overflowY: 'auto',
        pt: 3,
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
      }}
    >
      <SidebarContent onNavigate={onCloseDrawer} />
    </Box>
  );
}
