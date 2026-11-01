import { FormControl, FormHelperText, FormLabel } from '@mui/material';
import { useId } from 'react';

interface FieldGroupProps {
  legend: string;
  isRequired?: boolean;
  error?: string | undefined;
  /** Note under the options, such as why the whole field is locked. */
  hint?: string | undefined;
  children: React.ReactNode;
}

/** A named group of options: cards to tap, or a message saying why there are none. */
export function FieldGroup({
  legend,
  isRequired = false,
  error,
  hint,
  children,
}: FieldGroupProps): React.JSX.Element {
  const errorId = useId();

  return (
    <FormControl
      sx={{ minWidth: 0 }}
      component="fieldset"
      fullWidth
      error={error !== undefined}
      aria-describedby={error === undefined ? undefined : errorId}
    >
      <FormLabel component="legend" required={isRequired} sx={{ mb: 1, fontSize: '0.88rem' }}>
        {legend}
      </FormLabel>
      {children}
      {error === undefined ? null : <FormHelperText id={errorId}>{error}</FormHelperText>}
      {hint === undefined ? null : <FormHelperText>{hint}</FormHelperText>}
    </FormControl>
  );
}
