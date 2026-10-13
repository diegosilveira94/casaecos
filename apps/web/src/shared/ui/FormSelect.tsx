import type { ComponentProps } from 'react';

import { ChevronDownIcon } from './icons.js';

interface FormSelectProps extends ComponentProps<'select'> {
  /** True while the option shown is the prompt ("Escolha a casa"), drawn muted. */
  showsPrompt?: boolean;
}

/** Native select with the look of the form inputs: opens the system picker on the phone. */
export function FormSelect({
  showsPrompt = false,
  children,
  ...selectProps
}: FormSelectProps): React.JSX.Element {
  return (
    <div className={showsPrompt ? 'form-select form-select--prompt' : 'form-select'}>
      <select {...selectProps}>{children}</select>
      <ChevronDownIcon />
    </div>
  );
}
