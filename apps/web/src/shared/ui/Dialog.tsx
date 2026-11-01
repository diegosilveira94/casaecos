import {
  Box,
  Dialog as MuiDialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  type PaperProps,
} from '@mui/material';
import type { SyntheticEvent } from 'react';

import { CloseIcon } from './icons.js';

const MAX_WIDTH_BY_SIZE = { small: 'xs', medium: 'sm', large: 'md' } as const;

interface DialogProps {
  title: string;
  /** Small line above the title, such as the commitment type. */
  eyebrow?: React.ReactNode;
  size?: keyof typeof MAX_WIDTH_BY_SIZE;
  onClose: () => void;
  /** Turns the panel into the form, so that the footer stays on it while the fields scroll. */
  onSubmit?: (submitEvent: SyntheticEvent<HTMLFormElement>) => void;
  /** Footer, always in sight. */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Modal shell: bottom sheet on the phone, centered from 52rem. Closes on Escape, on
 * the backdrop and on "Fechar"; focus moves in and goes back to what opened it.
 */
export function Dialog({
  title,
  eyebrow,
  size = 'medium',
  onClose,
  onSubmit,
  actions,
  children,
}: DialogProps): React.JSX.Element {
  // The types of the panel know it as a div; `component` makes it the form.
  const formProps = onSubmit
    ? ({ component: 'form', noValidate: true, onSubmit } as unknown as PaperProps)
    : {};

  return (
    <MuiDialog
      open
      fullWidth
      maxWidth={MAX_WIDTH_BY_SIZE[size]}
      onClose={onClose}
      sx={{ '& .MuiDialog-container': { alignItems: { xs: 'flex-end', md: 'center' } } }}
      slotProps={{
        paper: {
          ...formProps,
          sx: {
            m: { xs: 0, md: 4 },
            width: '100%',
            maxHeight: { xs: '94dvh', md: '90dvh' },
            borderRadius: { xs: '16px 16px 0 0', md: '16px' },
          },
        },
      }}
    >
      <Stack
        component="header"
        direction="row"
        spacing={2}
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between', pt: 2, pr: 2, pb: 1 }}
      >
        <Box sx={{ minWidth: 0 }}>
          {eyebrow ? <Box sx={{ px: 3 }}>{eyebrow}</Box> : null}
          <DialogTitle sx={{ py: 0, fontWeight: 600 }}>{title}</DialogTitle>
        </Box>
        <IconButton autoFocus aria-label="Fechar" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>
      <DialogContent sx={{ pt: 1 }}>{children}</DialogContent>
      {actions ? <DialogActions>{actions}</DialogActions> : null}
    </MuiDialog>
  );
}
