import { act, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GoogleLoginButton } from './GoogleLoginButton.js';

vi.mock('../../../../config/env.js', () => ({
  env: {
    apiUrl: 'http://api.test',
    googleClientId: 'client-id.apps.googleusercontent.com',
  },
}));

describe('GoogleLoginButton', () => {
  afterEach(() => {
    document.getElementById('google-identity-services')?.remove();
    delete window.google;
  });

  it('renderiza o botão oficial e entrega a credencial retornada pelo Google', async () => {
    const onCredential = vi.fn();
    const initialize = vi.fn();
    const renderButton = vi.fn((parent: HTMLElement, _options: Record<string, unknown>) => {
      const button = document.createElement('button');
      button.textContent = 'Entrar com Google';
      parent.append(button);
    });

    render(<GoogleLoginButton disabled={false} onCredential={onCredential} onError={vi.fn()} />);

    const script = document.getElementById('google-identity-services');
    expect(script).toHaveAttribute(
      'src',
      expect.stringContaining('accounts.google.com/gsi/client'),
    );

    window.google = { accounts: { id: { initialize, renderButton } } };
    act(() => {
      script?.dispatchEvent(new Event('load'));
    });

    await waitFor(() => {
      expect(initialize).toHaveBeenCalledOnce();
    });
    expect(renderButton).toHaveBeenCalledOnce();
    expect(renderButton.mock.calls[0]?.[1]).toMatchObject({
      text: 'signin_with',
      locale: 'pt-BR',
    });

    const configuration = initialize.mock.calls[0]?.[0] as {
      callback: (response: { credential: string }) => void;
    };
    act(() => {
      configuration.callback({ credential: 'id-token-google' });
    });

    expect(onCredential).toHaveBeenCalledWith('id-token-google');
  });
});
