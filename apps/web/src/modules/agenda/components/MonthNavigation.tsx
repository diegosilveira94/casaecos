import { COMING_SOON_PROPS } from '../../../shared/ui/coming-soon.js';
import { ChevronLeftIcon, ChevronRightIcon } from '../../../shared/ui/icons.js';
import type { CalendarMonth } from '../domain/calendar-month.js';

interface MonthNavigationProps {
  month: CalendarMonth;
  onShowMonth: (month: CalendarMonth) => void;
  onShowToday: () => void;
}

export function MonthNavigation({
  month,
  onShowMonth,
  onShowToday,
}: MonthNavigationProps): React.JSX.Element {
  return (
    <div className="month-navigation">
      <div className="month-navigation__controls">
        <div className="button-group">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() => {
              onShowMonth(month.previous());
            }}
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            aria-label="Próximo mês"
            onClick={() => {
              onShowMonth(month.next());
            }}
          >
            <ChevronRightIcon />
          </button>
        </div>
        <button className="outline-button" type="button" onClick={onShowToday}>
          Hoje
        </button>
      </div>

      <h2 aria-live="polite">{month.label}</h2>

      {/* Week and day views are ECOS-23. */}
      <div className="button-group month-navigation__views" role="group" aria-label="Visão">
        <button type="button" aria-pressed="true">
          Mês
        </button>
        <button {...COMING_SOON_PROPS} aria-pressed="false">
          Semana
        </button>
        <button {...COMING_SOON_PROPS} aria-pressed="false">
          Dia
        </button>
      </div>
    </div>
  );
}
