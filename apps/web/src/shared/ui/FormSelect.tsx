import { TextField, type TextFieldProps } from '@mui/material';

/** Native select, which opens the system picker on the phone; `<option>`s as children. */
export function FormSelect({ children, ...fieldProps }: TextFieldProps): React.JSX.Element {
  return (
    <TextField select {...fieldProps} slotProps={{ select: { native: true } }}>
      {children}
    </TextField>
  );
}
