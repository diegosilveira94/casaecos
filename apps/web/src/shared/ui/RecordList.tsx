import { Box, ButtonBase } from '@mui/material';

const ROW_LAYOUT = {
  display: 'grid',
  width: '100%',
  gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', md: 'var(--record-columns)' },
  alignItems: { md: 'center' },
  gap: { xs: '0.2rem 0.75rem', md: 2 },
  minHeight: { md: '3.6rem' },
  px: { xs: 2, md: 2.25 },
  py: { xs: 1.75, md: 1.25 },
  bgcolor: 'background.paper',
  borderStyle: 'solid',
  borderWidth: { xs: '1px', md: '1px 0 0' },
  borderColor: 'divider',
  borderRadius: { xs: 3, md: 0 },
  textAlign: 'left',
} as const;

interface RecordListProps {
  /** `grid-template-columns` of the table on the desktop. */
  columns: string;
  headers: readonly string[];
  children: React.ReactNode;
}

/** Records as cards on the phone and as the rows of one table from 52rem. */
export function RecordList({ columns, headers, children }: RecordListProps): React.JSX.Element {
  return (
    <Box
      component="ul"
      sx={{
        '--record-columns': columns,
        display: 'grid',
        gap: { xs: 1, md: 0 },
        overflow: { md: 'hidden' },
        bgcolor: { md: 'background.paper' },
        border: { md: 1 },
        borderColor: { md: 'divider' },
        borderRadius: { md: 3 },
      }}
    >
      <Box
        component="li"
        aria-hidden="true"
        sx={{
          display: { xs: 'none', md: 'grid' },
          gridTemplateColumns: 'var(--record-columns)',
          alignItems: 'center',
          gap: 2,
          px: 2.25,
          py: 1.25,
          color: 'text.secondary',
          fontSize: '0.78rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {headers.map((header, position) => (
          <span key={position}>{header}</span>
        ))}
      </Box>
      {children}
    </Box>
  );
}

export function RecordRow({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <Box sx={ROW_LAYOUT}>{children}</Box>;
}

interface RecordRowButtonProps {
  isDisabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function RecordRowButton({
  isDisabled,
  onClick,
  children,
}: RecordRowButtonProps): React.JSX.Element {
  return (
    <ButtonBase
      disabled={isDisabled}
      onClick={onClick}
      sx={{ ...ROW_LAYOUT, '&:hover': { bgcolor: 'action.hover' } }}
    >
      {children}
    </ButtonBase>
  );
}
