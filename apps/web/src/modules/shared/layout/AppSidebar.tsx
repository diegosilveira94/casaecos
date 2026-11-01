import { NavLink } from 'react-router';

import landscapeUrl from '../../../assets/sidebar-landscape.png';
import { COMING_SOON_PROPS } from '../../../shared/ui/coming-soon.js';
import {
  CalendarIcon,
  ChartIcon,
  DollarIcon,
  GearIcon,
  HelpIcon,
  PillIcon,
} from '../../../shared/ui/icons.js';
import { useAuth } from '../auth/context/use-auth.js';
import { AppBrand } from './AppBrand.js';
import { HomePicker } from './HomePicker.js';

// Shown as in the prototype; they become links as each module ships.
const UPCOMING_MODULES = [
  { label: 'Medicamentos', icon: <PillIcon /> },
  { label: 'Relatórios', icon: <ChartIcon /> },
  { label: 'Prestação de Contas', icon: <DollarIcon /> },
];

interface UpcomingModuleProps {
  label: string;
  icon: React.ReactNode;
}

function UpcomingModule({ label, icon }: UpcomingModuleProps): React.JSX.Element {
  return (
    <button className="app-sidebar__link" {...COMING_SOON_PROPS}>
      {icon}
      {label}
    </button>
  );
}

interface AppSidebarProps {
  onNavigate: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps): React.JSX.Element {
  const { can } = useAuth();

  return (
    <aside className="app-sidebar" id="app-sidebar">
      <AppBrand layout="stacked" />

      <nav className="app-sidebar__nav" aria-label="Módulos">
        <NavLink to="/agenda" className="app-sidebar__link" onClick={onNavigate}>
          <CalendarIcon />
          Agenda
        </NavLink>
        {UPCOMING_MODULES.map(({ label, icon }) => (
          <UpcomingModule key={label} label={label} icon={icon} />
        ))}
        {/* The registers are the coordination's: the other roles do not see them. */}
        {can('person:read') ? (
          <NavLink to="/settings" className="app-sidebar__link" onClick={onNavigate}>
            <GearIcon />
            Configurações
          </NavLink>
        ) : null}
        <UpcomingModule label="Ajuda" icon={<HelpIcon />} />
      </nav>

      <div className="app-sidebar__footer">
        <HomePicker />
        <p className="app-sidebar__tagline">Cuidando de quem cuida.</p>
      </div>

      <img className="app-sidebar__landscape" src={landscapeUrl} alt="" width={228} height={161} />
    </aside>
  );
}
