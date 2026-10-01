import { useAuth } from '../auth/context/use-auth.js';
import { BrandMark } from './BrandMark.js';

/** Top bar of the logged-in screens: brand, who is using the system and the exit. */
export function AppHeader(): React.JSX.Element {
  const auth = useAuth();

  return (
    <header className="app-header">
      <div className="brand-lockup brand-lockup--compact">
        <BrandMark />
        <div>
          <strong>Casa Ecos</strong>
          <span>Ecos da Esperança</span>
        </div>
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
