import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App.js';

describe('App', () => {
  it('mostra o nome do sistema', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'EcoAgenda' })).toBeInTheDocument();
  });
});
