import { Box, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { useState, type SyntheticEvent } from 'react';
import { Navigate, useLocation } from 'react-router';

import { ApiRequestError } from '../../../../shared/http/api-request-error.js';
import { AlertMessage } from '../../../../shared/ui/AlertMessage.js';
import { Dialog } from '../../../../shared/ui/Dialog.js';
import { BrandMark } from '../../layout/BrandMark.js';
import { PasswordInput } from '../components/PasswordInput.js';
import { SessionRestoring } from '../components/SessionRestoring.js';
import { useAuth } from '../context/use-auth.js';

const AGENDA_PATH = '/agenda';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNEXPECTED_ERROR_MESSAGE = 'Não foi possível entrar. Tente novamente.';

interface RedirectState {
  from?: { pathname: string };
}

function BrandLockup({ isOnBrandPanel }: { isOnBrandPanel: boolean }): React.JSX.Element {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: 'center',
        color: isOnBrandPanel ? 'common.white' : 'primary.main',
        // The panel only exists on the desktop, where it carries the brand instead.
        display: isOnBrandPanel ? 'flex' : { xs: 'flex', md: 'none' },
      }}
    >
      <BrandMark />
      <div>
        <Typography component="strong" sx={{ display: 'block', fontWeight: 700 }}>
          Casa Ecos
        </Typography>
        <Typography
          variant="caption"
          sx={{ textTransform: 'uppercase', color: isOnBrandPanel ? 'inherit' : 'text.secondary' }}
        >
          Ecos da Esperança
        </Typography>
      </div>
    </Stack>
  );
}

// ApiRequestError already carries the Portuguese text (wrong password, too many
// attempts, server offline); anything else is a defect of ours.
function loginErrorMessage(error: unknown): string {
  return error instanceof ApiRequestError ? error.message : UNEXPECTED_ERROR_MESSAGE;
}

export function LoginPage(): React.JSX.Element {
  const auth = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showsPasswordHelp, setShowsPasswordHelp] = useState(false);

  if (auth.status === 'restoring') return <SessionRestoring />;

  if (auth.status === 'authenticated') {
    const destination = (location.state as RedirectState | null)?.from?.pathname ?? AGENDA_PATH;
    return <Navigate to={destination} replace />;
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Informe um e-mail válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      // On success the status turns `authenticated` and the redirect above takes over.
      await auth.login({ email: trimmedEmail, password });
    } catch (loginError: unknown) {
      setError(loginErrorMessage(loginError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100dvh',
        bgcolor: 'background.paper',
        display: { md: 'grid' },
        gridTemplateColumns: { md: 'minmax(20rem, 0.95fr) minmax(28rem, 1.05fr)' },
      }}
    >
      <Stack
        component="section"
        aria-label="Casa Ecos"
        sx={{
          display: { xs: 'none', md: 'flex' },
          justifyContent: 'space-between',
          minHeight: '100dvh',
          p: 'clamp(2rem, 5vw, 4.5rem)',
          background: 'linear-gradient(145deg, #1d7352, #0d4832)',
          color: 'common.white',
        }}
      >
        <BrandLockup isOnBrandPanel />
        <Typography component="h2" variant="h2" sx={{ mb: '9vh', fontWeight: 700 }}>
          Cuidando de quem cuida.
        </Typography>
      </Stack>

      <Box
        component="section"
        sx={{ display: 'flex', minHeight: '100dvh', px: 2.5, py: 4, p: { md: 6 } }}
      >
        <Box sx={{ flex: '1 1 0', minWidth: 0, maxWidth: '27rem', m: 'auto' }}>
          <BrandLockup isOnBrandPanel={false} />

          <Box sx={{ mt: { xs: 6, md: 0 } }}>
            <Typography color="primary" variant="overline" sx={{ fontWeight: 700 }}>
              Bem-vindo de volta
            </Typography>
            <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>
              Acesse sua conta
            </Typography>
          </Box>

          <Stack
            component="form"
            spacing={2.5}
            sx={{ mt: 4 }}
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
            noValidate
          >
            <TextField
              label="E-mail"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
              disabled={isSubmitting}
              slotProps={{ htmlInput: { inputMode: 'email' } }}
            />

            <Stack spacing={0.5} sx={{ alignItems: 'flex-end' }}>
              <PasswordInput
                label="Senha"
                name="password"
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
                disabled={isSubmitting}
              />
              <Link
                variant="body2"
                sx={{ fontWeight: 700 }}
                component="button"
                type="button"
                onClick={() => {
                  setShowsPasswordHelp(true);
                }}
              >
                Esqueceu a senha?
              </Link>
            </Stack>

            {error ? <AlertMessage>{error}</AlertMessage> : null}

            <Button
              type="submit"
              size="large"
              variant="contained"
              loading={isSubmitting}
              loadingPosition="start"
              disabled={!email.trim() || !password}
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </Stack>

          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 4, textAlign: 'center' }}>
            Problemas para acessar?{' '}
            <Box component="strong" sx={{ color: 'primary.main' }}>
              Fale com a Coordenação.
            </Box>
          </Typography>
        </Box>
      </Box>

      {showsPasswordHelp ? (
        <Dialog
          title="Esqueceu a senha?"
          onClose={() => {
            setShowsPasswordHelp(false);
          }}
          actions={
            <Button
              variant="contained"
              onClick={() => {
                setShowsPasswordHelp(false);
              }}
            >
              Entendi
            </Button>
          }
        >
          <Stack spacing={2}>
            <Typography sx={{ color: 'text.secondary' }}>
              Por enquanto, a recuperação automática por e-mail não está disponível.
            </Typography>
            <Typography sx={{ color: 'text.secondary' }}>
              Solicite à Coordenação uma nova senha.
            </Typography>
          </Stack>
        </Dialog>
      ) : null}
    </Box>
  );
}
