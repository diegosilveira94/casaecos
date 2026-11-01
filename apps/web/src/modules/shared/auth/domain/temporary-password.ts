// Short Portuguese words, easy to read aloud or type on a phone.
const WORDS = ['sol', 'rio', 'mar', 'flor', 'casa', 'lua', 'ipe', 'ninho', 'vento', 'serra'];

function randomIndex(size: number): number {
  const [value = 0] = crypto.getRandomValues(new Uint32Array(1));
  return value % size;
}

/**
 * A first password the coordination hands over in person: two words and four digits,
 * such as `flor-rio-4821`. Above the 8 characters the API requires.
 */
export function temporaryPassword(): string {
  const word = (): string => WORDS[randomIndex(WORDS.length)] ?? 'casa';
  const digits = String(1000 + randomIndex(9000));
  return `${word()}-${word()}-${digits}`;
}
