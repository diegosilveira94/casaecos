import { useAuth } from '../auth/context/use-auth.js';
import { AppBrand } from './AppBrand.js';

/** Top bar: who is using the system and the exit. The brand only shows on the phone. */
export function AppHeader(): React.JSX.Element {
  const auth = useAuth();

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <AppBrand />
      </div>

      <div className="app-header__user">
        {auth.status === 'authenticated' ? (
          <p className="app-header__identity">
            <strong>{auth.user.name}</strong>
            <span>{auth.user.role.description}</span>
          </p>
        ) : null}
        <button
          className="secondary-button secondary-button--compact"
          type="button"
          onClick={auth.logout}
        >
          Sair
        </button>
      </div>
    </header>
  );
}
