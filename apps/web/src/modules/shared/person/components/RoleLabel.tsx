import { Box, Stack, Typography } from '@mui/material';

import type { RoleResponse } from '@casaecos/shared-types';

import { toneColors } from '../../../agenda/domain/event-tone.js';
import { roleGuide } from '../domain/roles.js';

interface RoleLabelProps {
  role: RoleResponse;
}

/** The role as plain text after a dot in its color. */
export function RoleLabel({ role }: RoleLabelProps): React.JSX.Element {
  return (
    <Stack
      component="span"
      direction="row"
      spacing={0.75}
      sx={{ alignItems: 'center', justifySelf: 'start', whiteSpace: 'nowrap' }}
    >
      <Box
        component="span"
        sx={{
          flex: 'none',
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: toneColors(roleGuide(role.id).tone).color,
        }}
      />
      <Typography component="span" variant="body2">
        {role.description}
      </Typography>
    </Stack>
  );
}
