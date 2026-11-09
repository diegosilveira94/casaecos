import { Box, CircularProgress } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import { env } from '../../../../config/env.js';

const GOOGLE_SCRIPT_ID = 'google-identity-services';
const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client?hl=pt-BR';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdentityApi {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    use_fedcm_for_button: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type: 'standard';
      theme: 'outline';
      size: 'large';
      text: 'signin_with';
      shape: 'rectangular';
      width: number;
      locale: string;
    },
  ): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentityApi } };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadGoogleIdentity(): Promise<void> {
  if (window.google) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID);
    const script =
      existing instanceof HTMLScriptElement ? existing : document.createElement('script');

    const loaded = (): void => {
      if (window.google) resolve();
      else reject(new Error('Google Identity Services não carregou'));
    };
    script.addEventListener('load', loaded, { once: true });
    script.addEventListener(
      'error',
      () => {
        reject(new Error('Falha ao carregar o Google'));
      },
      { once: true },
    );

    if (!existing) {
      script.id = GOOGLE_SCRIPT_ID;
      script.src = GOOGLE_SCRIPT_URL;
      script.async = true;
      document.head.append(script);
    }
  });

  return scriptPromise;
}

interface GoogleLoginButtonProps {
  disabled: boolean;
  onCredential: (credential: string) => void;
  onError: () => void;
}

/** The visual button must be rendered by Google to follow its identity guidelines. */
export function GoogleLoginButton({
  disabled,
  onCredential,
  onError,
}: GoogleLoginButtonProps): React.JSX.Element | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const credentialHandler = useRef(onCredential);
  const errorHandler = useRef(onError);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    credentialHandler.current = onCredential;
    errorHandler.current = onError;
  }, [onCredential, onError]);

  useEffect(() => {
    if (!env.googleClientId) return;

    let isCurrent = true;
    void loadGoogleIdentity().then(
      () => {
        if (!isCurrent || !window.google || !containerRef.current || !env.googleClientId) return;

        window.google.accounts.id.initialize({
          client_id: env.googleClientId,
          use_fedcm_for_button: true,
          callback: (response) => {
            if (response.credential) credentialHandler.current(response.credential);
            else errorHandler.current();
          },
        });
        containerRef.current.replaceChildren();
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: 432,
          locale: 'pt-BR',
        });
        setIsLoading(false);
      },
      () => {
        if (isCurrent) {
          setIsLoading(false);
          errorHandler.current();
        }
      },
    );

    return () => {
      isCurrent = false;
    };
  }, []);

  if (!env.googleClientId) return null;

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: 44,
        opacity: disabled ? 0.55 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        '& > div': { display: 'flex', justifyContent: 'center' },
      }}
    >
      <div ref={containerRef} />
      {isLoading ? (
        <CircularProgress
          aria-label="Carregando login do Google"
          size={24}
          sx={{ position: 'absolute', inset: 0, m: 'auto' }}
        />
      ) : null}
    </Box>
  );
}
