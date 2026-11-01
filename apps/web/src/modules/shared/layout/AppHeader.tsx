import {
  AppBar,
  Avatar,
  Box,
  ButtonBase,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import { COMING_SOON_PROPS } from '../../../shared/ui/coming-soon.js';
import { BellIcon, ChevronDownIcon, MenuIcon, UserIcon } from '../../../shared/ui/icons.js';
import { useAuth } from '../auth/context/use-auth.js';
import { ResetPasswordDialog } from '../auth/components/PasswordDialogs.js';
import { AppBrand } from './AppBrand.js';

interface AppHeaderProps {
  isMenuOpen: boolean;
  onToggleMenu: () => void;
}

function UserMenu(): React.JSX.Element | null {
  const auth = useAuth();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);

  if (auth.status !== 'authenticated') return null;

  const closeMenu = (): void => {
    setMenuAnchor(null);
  };

  return (
    <>
      <ButtonBase
        aria-haspopup="menu"
        aria-expanded={menuAnchor !== null}
        onClick={(clickEvent) => {
          setMenuAnchor(clickEvent.currentTarget);
        }}
        sx={{ gap: 1, minWidth: 0, p: 0.5, borderRadius: 2, textAlign: 'left' }}
      >
        <Avatar sx={{ bgcolor: 'primary.main' }}>
          <UserIcon />
        </Avatar>
        <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 0 }}>
          <Typography noWrap variant="body2" sx={{ fontWeight: 600 }}>
            {auth.user.name}
          </Typography>
          <Typography noWrap variant="caption" component="p" sx={{ color: 'text.secondary' }}>
            {auth.user.role.description}
          </Typography>
        </Box>
        <ChevronDownIcon />
      </ButtonBase>
      <Menu
        anchorEl={menuAnchor}
        open={menuAnchor !== null}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        onClose={closeMenu}
      >
        {auth.can('account:manage') ? (
          <MenuItem
            onClick={() => {
              closeMenu();
              setIsResetPasswordOpen(true);
            }}
          >
            Redefinir senha
          </MenuItem>
        ) : null}
        <MenuItem onClick={auth.logout}>Sair</MenuItem>
      </Menu>
      {isResetPasswordOpen ? (
        <ResetPasswordDialog
          onClose={() => {
            setIsResetPasswordOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

/** Top bar: the menu toggle, notifications (not built yet) and the user's menu. */
export function AppHeader({ isMenuOpen, onToggleMenu }: AppHeaderProps): React.JSX.Element {
  return (
    <AppBar
      color="inherit"
      elevation={0}
      position="sticky"
      sx={{ borderBottom: 1, borderColor: 'divider' }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', gap: 1 }}>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
          <IconButton
            aria-label="Menu"
            aria-controls="app-sidebar"
            aria-expanded={isMenuOpen}
            onClick={onToggleMenu}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: { md: 'none' } }}>
            <AppBrand layout="inline" />
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={{ xs: 0.5, md: 3 }}
          sx={{ alignItems: 'center', minWidth: 0 }}
        >
          <IconButton aria-label="Notificações" {...COMING_SOON_PROPS}>
            <BellIcon />
          </IconButton>
          <UserMenu />
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
