import { useCallback, useRef, useState } from 'react';

import type { EventTypeResponse } from '@casaecos/shared-types';

import { FilterIcon } from '../../../shared/ui/icons.js';
import { useDismiss } from '../../../shared/ui/use-dismiss.js';

interface FiltersMenuProps {
  eventTypes: EventTypeResponse[];
  eventTypeId: number | undefined;
  onChangeEventType: (eventTypeId: number | undefined) => void;
}

const ALL_TYPES = '';

/** "Filtros" of the prototype. The home is picked in the sidebar; here goes the type. */
export function FiltersMenu({
  eventTypes,
  eventTypeId,
  onChangeEventType,
}: FiltersMenuProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);
  useDismiss(menu, isOpen, close);

  const activeCount = eventTypeId === undefined ? 0 : 1;

  return (
    <div className="filters-menu" ref={menu}>
      <button
        className="outline-button"
        type="button"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((current) => !current);
        }}
      >
        <FilterIcon />
        Filtros
        {activeCount > 0 ? (
          <>
            <span className="filters-menu__count" aria-hidden="true">
              {activeCount}
            </span>
            <span className="visually-hidden">({activeCount} ativo)</span>
          </>
        ) : null}
      </button>

      {isOpen ? (
        <div className="filters-menu__popover">
          <label className="select-field">
            <span>Tipo de compromisso</span>
            <select
              value={eventTypeId ?? ALL_TYPES}
              onChange={(event) => {
                const { value } = event.target;
                onChangeEventType(value === ALL_TYPES ? undefined : Number(value));
              }}
            >
              <option value={ALL_TYPES}>Todos os tipos</option>
              {eventTypes.map((eventType) => (
                <option key={eventType.id} value={eventType.id}>
                  {eventType.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </div>
  );
}
