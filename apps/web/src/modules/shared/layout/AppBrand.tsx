import { Box, Stack } from '@mui/material';

import logoUrl from '../../../assets/brand-logo.png';
import wordmarkUrl from '../../../assets/brand-wordmark.png';

interface AppBrandProps {
  /** Stacked in the sidebar, side by side in the phone top bar. */
  layout: 'stacked' | 'inline';
}

export function AppBrand({ layout }: AppBrandProps): React.JSX.Element {
  const isInline = layout === 'inline';

  return (
    <Stack
      direction={isInline ? 'row' : 'column'}
      spacing={isInline ? 1 : 0.5}
      sx={{ alignItems: 'center' }}
    >
      <Box
        component="img"
        src={logoUrl}
        alt=""
        width={73}
        height={50}
        sx={isInline ? { width: '2.6rem', height: 'auto' } : {}}
      />
      <Box
        component="img"
        src={wordmarkUrl}
        alt="Casa Ecos"
        width={117}
        height={18}
        sx={isInline ? { width: '5.6rem', height: 'auto' } : {}}
      />
    </Stack>
  );
}
