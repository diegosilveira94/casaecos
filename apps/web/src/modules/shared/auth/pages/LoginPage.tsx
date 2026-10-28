import { useState, type SyntheticEvent } from 'react';
import { Navigate, useLocation } from 'react-router';

import { ApiRequestError } from '../../../../shared/http/api-request-error.js';
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

function BrandLockup({ variant }: { variant: 'light' | 'mobile' }): React.JSX.Element {
  return (
    <div className={`brand-lockup brand-lockup--${variant}`}>
      <BrandMark />
      <div>
        <strong>Casa Ecos</strong>
        <span>Ecos da Esperança</span>
      </div>
    </div>
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
    <main className="login-page">
      <section className="login-brand" aria-label="Casa Ecos">
        <div className="login-brand__content">
          <BrandLockup variant="light" />
          <div className="login-brand__message">
            <h2>Cuidando de quem cuida.</h2>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-panel__content">
          <BrandLockup variant="mobile" />

          <div className="login-heading">
            <span className="login-heading__eyebrow">Bem-vindo de volta</span>
            <h1>Acesse sua conta</h1>
          </div>

          <form
            className="login-form"
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
            noValidate
          >
            <div className="form-field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="form-field">
              <div className="login-password-heading">
                <label htmlFor="password">Senha</label>
                <button
                  className="forgot-password-button"
                  type="button"
                  onClick={() => {
                    setShowsPasswordHelp(true);
                  }}
                >
                  Esqueceu a senha?
                </button>
              </div>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
                disabled={isSubmitting}
                required
              />
            </div>

            {error ? (
              <div className="login-error" role="alert">
                <span aria-hidden="true">!</span>
                <p>{error}</p>
              </div>
            ) : null}

            <button
              className="primary-button"
              type="submit"
              disabled={isSubmitting || !email.trim() || !password}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? <span className="spinner" aria-hidden="true" /> : null}
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="login-support">
            Problemas para acessar? <strong>Fale com a Coordenação.</strong>
          </p>
        </div>
      </section>

      {showsPasswordHelp ? (
        <Dialog
          title="Esqueceu a senha?"
          className="dialog__panel--login-help"
          onClose={() => {
            setShowsPasswordHelp(false);
          }}
        >
          <div className="login-password-help">
            <p>Por enquanto, a recuperação automática por e-mail não está disponível.</p>
            <p>Solicite à Coordenação uma nova senha. Não é necessário informar sua senha atual.</p>
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setShowsPasswordHelp(false);
              }}
            >
              Entendi
            </button>
          </div>
        </Dialog>
      ) : null}
    </main>
  );
}
