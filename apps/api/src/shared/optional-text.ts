/**
 * Trims an optional text field and turns a blank one into `null`, so clearing a
 * field on screen stores "no value" instead of an empty string. `undefined` stays
 * `undefined`: in an edit it means the field was not sent.
 */
export function normalizeOptionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalizedValue = value.trim();
  if (normalizedValue.length === 0) return null;
  return normalizedValue;
}
