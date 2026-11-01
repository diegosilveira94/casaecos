import { Box, Button, Typography } from '@mui/material';
import { NavLink, Outlet } from 'react-router';

import { useAuth } from '../../auth/context/use-auth.js';

// Links, not ARIA tabs: each one is a route, reached and shared by its URL.
const TAB_SX = {
  flex: 'none',
  minHeight: '2.9rem',
  px: 1.75,
  color: 'text.secondary',
  borderBottom: 3,
  borderColor: 'transparent',
  borderRadius: 0,
  '&[aria-current="page"]': { color: 'primary.main', borderColor: 'primary.main' },
};

/** Configurações: the registers the NGO keeps, one tab per route. */
export function SettingsLayout(): React.JSX.Element {
  const { can } = useAuth();

  return (
    <Box
      component="main"
      sx={{
        width: '100%',
        maxWidth: '72rem',
        px: { xs: 2, md: 4.5 },
        pt: { xs: 2.5, md: 4 },
        pb: 12,
      }}
    >
      <Typography component="h1" variant="h4" sx={{ fontWeight: 600 }}>
        Configurações
      </Typography>
      <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>
        Casas, pessoas e quem acessa o sistema.
      </Typography>
      <Box
        component="nav"
        aria-label="Cadastros"
        sx={{
          display: 'flex',
          gap: 0.5,
          mt: 2.5,
          overflowX: 'auto',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Button color="inherit" component={NavLink} to="/settings/people" sx={TAB_SX}>
          Pessoas
        </Button>
        {can('home:read') ? (
          <Button color="inherit" component={NavLink} to="/settings/homes" sx={TAB_SX}>
            Casas
          </Button>
        ) : null}
        {can('account:manage') ? (
          <Button color="inherit" component={NavLink} to="/settings/access" sx={TAB_SX}>
            Acessos
          </Button>
        ) : null}
      </Box>
      <Outlet />
    </Box>
  );
}
