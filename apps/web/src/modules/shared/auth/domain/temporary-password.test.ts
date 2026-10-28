import { describe, expect, it } from 'vitest';

import { temporaryPassword } from './temporary-password.js';

describe('temporaryPassword', () => {
  it('gera duas palavras e quatro dígitos, acima do mínimo da API', () => {
    const password = temporaryPassword();

    expect(password).toMatch(/^[a-z]+-[a-z]+-\d{4}$/);
    expect(password.length).toBeGreaterThanOrEqual(8);
  });
});
