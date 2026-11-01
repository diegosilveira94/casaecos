import type { SxProps, Theme } from '@mui/material';

/** The name of the record, always in sight. */
export const RECORD_NAME_SX: SxProps<Theme> = {
  minWidth: 0,
  overflow: 'hidden',
  fontWeight: 600,
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/** A column of the table, which the phone sums up in the `RECORD_META_SX` line. */
export const RECORD_CELL_SX: SxProps<Theme> = {
  display: { xs: 'none', md: 'block' },
  minWidth: 0,
  overflow: 'hidden',
  fontSize: '0.92rem',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const RECORD_META_SX: SxProps<Theme> = {
  display: { md: 'none' },
  gridColumn: '1 / -1',
  color: 'text.secondary',
  fontSize: '0.85rem',
};

export const RECORD_ACTIONS_SX: SxProps<Theme> = {
  display: 'flex',
  gridColumn: { xs: '1 / -1', md: 'auto' },
  justifyContent: { md: 'flex-end' },
  mt: { xs: 1, md: 0 },
};
