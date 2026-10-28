import { NavLink, Outlet } from 'react-router';

import { useAuth } from '../../auth/context/use-auth.js';

/** Configurações: the registers the NGO keeps, one tab per route. */
export function SettingsLayout(): React.JSX.Element {
  const { can } = useAuth();

  return (
    <main className="settings-main">
      <div className="page-heading">
        <h1>Configurações</h1>
        <p>Casas, pessoas e quem acessa o sistema.</p>
      </div>
      <nav className="settings-tabs" aria-label="Cadastros">
        <NavLink to="/settings/people">Pessoas</NavLink>
        {can('home:read') ? <NavLink to="/settings/homes">Casas</NavLink> : null}
        {can('account:manage') ? <NavLink to="/settings/access">Acessos</NavLink> : null}
      </nav>
      <Outlet />
    </main>
  );
}
