import { fieldErrorId } from './field-error-props.js';

interface FormFieldProps {
  /** Id of the control inside, which the label and the error point to. */
  id: string;
  label: string;
  isRequired?: boolean;
  error?: string | undefined;
  /** Quiet note under the control, such as a character count. */
  hint?: string | undefined;
  className?: string;
  children: React.ReactNode;
}

/** The `*` of a required field. Optional fields carry no mark. */
export function RequiredMark(): React.JSX.Element {
  return (
    <span className="form-field__required" aria-hidden="true">
      {' *'}
    </span>
  );
}

/** Label, control and its error. The control comes as the child and takes `id`. */
export function FormField({
  id,
  label,
  isRequired = false,
  error,
  hint,
  className = '',
  children,
}: FormFieldProps): React.JSX.Element {
  return (
    <div className={`form-field ${className}`}>
      <label htmlFor={id}>
        {label}
        {isRequired ? <RequiredMark /> : null}
      </label>
      {children}
      {error !== undefined || hint !== undefined ? (
        <div className="form-field__footer">
          {error === undefined ? null : (
            <p className="form-field__error" id={fieldErrorId(id)}>
              {error}
            </p>
          )}
          {hint === undefined ? null : <p className="form-field__hint">{hint}</p>}
        </div>
      ) : null}
    </div>
  );
}
