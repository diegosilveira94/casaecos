import { NavLink } from 'react-router';

import { AppBrand } from './AppBrand.js';

function CalendarIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

// Only modules that already have a screen: a link with no destination misleads the
// caregiver (#95). Medicamentos, Relatórios and the others join as they ship.
const NAVIGATION = [{ to: '/agenda', label: 'Agenda', icon: <CalendarIcon /> }];

/** Desktop navigation. The phone has a single module for now, so it has no menu. */
export function AppSidebar(): React.JSX.Element {
  return (
    <aside className="app-sidebar">
      <AppBrand />

      <nav className="app-sidebar__nav" aria-label="Módulos">
        {NAVIGATION.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} className="app-sidebar__link">
            {icon}
            {label}
          </NavLink>
        ))}
      </nav>

      <p className="app-sidebar__tagline">Cuidando de quem cuida.</p>
    </aside>
  );
}
