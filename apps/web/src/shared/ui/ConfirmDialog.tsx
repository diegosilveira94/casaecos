import { Button, Typography } from '@mui/material';

import { Dialog } from './Dialog.js';

interface ConfirmDialogProps {
  /** The question, such as "Descartar alterações?". */
  title: string;
  /** What is lost by going ahead. */
  children: React.ReactNode;
  /** The action that loses something, drawn in red. */
  destructiveLabel: string;
  /** The way back, drawn as the main button. */
  keepLabel: string;
  /** True while the destructive action runs: both buttons wait. */
  isBusy?: boolean;
  onConfirm: () => void;
  /** Also what Escape, the backdrop and "Fechar" do. */
  onKeep: () => void;
}

/** Asks before something that cannot be undone. Stacks over the dialog that opened it. */
export function ConfirmDialog({
  title,
  children,
  destructiveLabel,
  keepLabel,
  isBusy = false,
  onConfirm,
  onKeep,
}: ConfirmDialogProps): React.JSX.Element {
  return (
    <Dialog
      title={title}
      size="small"
      onClose={onKeep}
      actions={
        <>
          <Button color="error" variant="contained" disabled={isBusy} onClick={onConfirm}>
            {destructiveLabel}
          </Button>
          <Button variant="contained" disabled={isBusy} onClick={onKeep}>
            {keepLabel}
          </Button>
        </>
      }
    >
      <Typography sx={{ color: 'text.secondary', '& strong': { color: 'text.primary' } }}>
        {children}
      </Typography>
    </Dialog>
  );
}
