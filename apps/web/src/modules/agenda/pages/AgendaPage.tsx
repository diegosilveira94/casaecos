import { useAuth } from '../../auth/context/use-auth.js';

export function AgendaPage(): React.JSX.Element {
  const { logout } = useAuth();

  return (
    <main className="agenda-placeholder">
      <header className="agenda-placeholder__header">
        <div>
          <span className="agenda-placeholder__eyebrow">EcoAgenda</span>
          <h1>Agenda</h1>
        </div>
        <button className="secondary-button" type="button" onClick={logout}>
          Sair
        </button>
      </header>
      <p>Você entrou no sistema com segurança.</p>
    </main>
  );
}
