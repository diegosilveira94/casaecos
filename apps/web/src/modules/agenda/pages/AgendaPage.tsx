import { useAuth } from '../../shared/auth/context/use-auth.js';

// Placeholder behind the protected route until the agenda screen (ECOS-8).
export function AgendaPage(): React.JSX.Element {
  const auth = useAuth();

  return (
    <main className="agenda-placeholder">
      <header className="agenda-placeholder__header">
        <div>
          <span className="agenda-placeholder__eyebrow">Casa Ecos</span>
          <h1>Agenda</h1>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            auth.logout();
          }}
        >
          Sair
        </button>
      </header>
      <p>Módulo de Agenda em desenvolvimento.</p>
    </main>
  );
}
