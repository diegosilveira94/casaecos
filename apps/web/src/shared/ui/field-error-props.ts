export function fieldErrorId(fieldId: string): string {
  return `${fieldId}-error`;
}

interface FieldErrorProps {
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

/**
 * What a control inside a `FormField` spreads so its error is announced with it. The
 * id matches the error paragraph `FormField` renders for the same field id.
 */
export function fieldErrorProps(fieldId: string, error: string | undefined): FieldErrorProps {
  return error === undefined
    ? {}
    : { 'aria-invalid': true, 'aria-describedby': fieldErrorId(fieldId) };
}
