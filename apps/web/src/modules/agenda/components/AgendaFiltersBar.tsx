import type { EventTypeResponse, HomeResponse } from '@casaecos/shared-types';

import type { AgendaFilters } from '../hooks/use-month-events.js';

interface AgendaFiltersBarProps {
  eventTypes: EventTypeResponse[];
  /** Empty when the home filter makes no sense for the user (one home, or no access). */
  homes: HomeResponse[];
  filters: AgendaFilters;
  onChange: (filters: AgendaFilters) => void;
}

const ALL = '';

function toFilterValue(selected: string): number | undefined {
  return selected === ALL ? undefined : Number(selected);
}

function withFilter(
  filters: AgendaFilters,
  name: keyof AgendaFilters,
  selected: string,
): AgendaFilters {
  const value = toFilterValue(selected);
  const { [name]: _removed, ...others } = filters;
  return value === undefined ? others : { ...others, [name]: value };
}

export function AgendaFiltersBar({
  eventTypes,
  homes,
  filters,
  onChange,
}: AgendaFiltersBarProps): React.JSX.Element | null {
  if (eventTypes.length === 0 && homes.length === 0) return null;

  return (
    <div className="agenda-filters">
      {homes.length > 0 ? (
        <label className="select-field">
          <span className="visually-hidden">Casa</span>
          <select
            value={filters.homeId ?? ALL}
            onChange={(event) => {
              onChange(withFilter(filters, 'homeId', event.target.value));
            }}
          >
            <option value={ALL}>Todas as casas</option>
            {homes.map((home) => (
              <option key={home.id} value={home.id}>
                {home.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {eventTypes.length > 0 ? (
        <label className="select-field">
          <span className="visually-hidden">Tipo de compromisso</span>
          <select
            value={filters.eventTypeId ?? ALL}
            onChange={(event) => {
              onChange(withFilter(filters, 'eventTypeId', event.target.value));
            }}
          >
            <option value={ALL}>Todos os tipos</option>
            {eventTypes.map((eventType) => (
              <option key={eventType.id} value={eventType.id}>
                {eventType.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
