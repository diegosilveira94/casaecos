import { useCallback, useRef, useState } from 'react';

import { COMING_SOON_PROPS } from '../../../shared/ui/coming-soon.js';
import { BellIcon, ChevronDownIcon, MenuIcon, UserIcon } from '../../../shared/ui/icons.js';
import { useDismiss } from '../../../shared/ui/use-dismiss.js';
import { useAuth } from '../auth/context/use-auth.js';
import { AppBrand } from './AppBrand.js';

interface AppHeaderProps {
  isMenuOpen: boolean;
  onToggleMenu: () => void;
}

function UserMenu(): React.JSX.Element | null {
  const auth = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);
  useDismiss(menu, isOpen, close);

  if (auth.status !== 'authenticated') return null;

  return (
    <div className="user-menu" ref={menu}>
      <button
        className="user-menu__trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((current) => !current);
        }}
      >
        <span className="user-menu__avatar">
          <UserIcon />
        </span>
        <span className="user-menu__identity">
          <strong>{auth.user.name}</strong>
          <span>{auth.user.role.description}</span>
        </span>
        <ChevronDownIcon />
      </button>
      {isOpen ? (
        <div className="user-menu__popover" role="menu">
          <button type="button" role="menuitem" onClick={auth.logout}>
            Sair
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Top bar: the menu toggle, notifications (not built yet) and the user's menu. */
export function AppHeader({ isMenuOpen, onToggleMenu }: AppHeaderProps): React.JSX.Element {
  return (
    <header className="app-header">
      <div className="app-header__start">
        <button
          className="app-header__icon-button"
          type="button"
          aria-label="Menu"
          aria-controls="app-sidebar"
          aria-expanded={isMenuOpen}
          onClick={onToggleMenu}
        >
          <MenuIcon />
        </button>
        <div className="app-header__brand">
          <AppBrand layout="inline" />
        </div>
      </div>

      <div className="app-header__end">
        <button
          className="app-header__icon-button"
          aria-label="Notificações"
          {...COMING_SOON_PROPS}
        >
          <BellIcon />
        </button>
        <UserMenu />
      </div>
    </header>
  );
}
