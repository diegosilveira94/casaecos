import { useState, type SyntheticEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { ApiRequestError } from '../../shared/http/http-client.js';
import { useAuth } from '../context/use-auth.js';

interface LocationState {
  from?: {
    pathname: string;
  };
}

function BrandMark(): React.JSX.Element {
  return (
    <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 42C16.2 34.2 8 27.4 8 18.4A9.4 9.4 0 0 1 24 11.6a9.4 9.4 0 0 1 16 6.8c0 9-8.2 15.8-16 23.6Z" />
      <path d="M24 35.5V17m0 10.5-7-7m7 2.5 7-7" />
    </svg>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.6" />
      {hidden ? <path d="m4 4 16 16" /> : null}
    </svg>
  );
}

export function LoginPage(): React.JSX.Element {
  const { isAuthenticated, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const state = location.state as LocationState | null;
  const destination = state?.from?.pathname ?? '/agenda';

  if (isAuthenticated) {
    return <Navigate to={destination} replace />;
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      void navigate(destination, { replace: true });
    } catch (requestError) {
      setError(
        requestError instanceof ApiRequestError && requestError.status === 401
          ? 'E-mail ou senha incorretos.'
          : 'Não foi possível entrar. Verifique sua conexão e tente novamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand" aria-label="EcoAgenda">
        <div className="login-brand__content">
          <div className="brand-lockup brand-lockup--light">
            <BrandMark />
            <div>
              <strong>EcoAgenda</strong>
              <span>Ecos da Esperança</span>
            </div>
          </div>
          <div className="login-brand__message">
            <p>Organização que acolhe.</p>
            <h2>Cuidando de hoje, transformando o amanhã.</h2>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-panel__content">
          <div className="brand-lockup brand-lockup--mobile">
            <BrandMark />
            <div>
              <strong>EcoAgenda</strong>
              <span>Ecos da Esperança</span>
            </div>
          </div>

          <div className="login-heading">
            <span className="login-heading__eyebrow">Bem-vindo de volta</span>
            <h1>Acesse sua conta</h1>
            <p>Entre com seus dados para acessar a agenda.</p>
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
              <label htmlFor="password">Senha</label>
              <div className="password-input">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                  }}
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => {
                    setShowPassword((current) => !current);
                  }}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  disabled={isSubmitting}
                >
                  <EyeIcon hidden={showPassword} />
                </button>
              </div>
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
            Problemas para acessar? <strong>Fale com a secretaria.</strong>
          </p>
        </div>
      </section>
    </main>
  );
}
