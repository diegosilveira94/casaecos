import { IconButton, InputAdornment, TextField, type TextFieldProps } from '@mui/material';
import { useState } from 'react';

import { HideIcon, ShowIcon } from '../../../../shared/ui/icons.js';

/** Password field shared by login and the authenticated password dialogs. */
export function PasswordInput({
  disabled,
  ...fieldProps
}: Omit<TextFieldProps, 'type'>): React.JSX.Element {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <TextField
      type={isVisible ? 'text' : 'password'}
      disabled={disabled ?? false}
      {...fieldProps}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                aria-label={isVisible ? 'Ocultar senha' : 'Mostrar senha'}
                disabled={disabled ?? false}
                onClick={() => {
                  setIsVisible((current) => !current);
                }}
              >
                {isVisible ? <HideIcon /> : <ShowIcon />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
