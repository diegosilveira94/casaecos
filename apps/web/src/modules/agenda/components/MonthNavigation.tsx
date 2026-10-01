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
      <div className="month-navigation__period">
        <button
          className="icon-button"
          type="button"
          aria-label="Mês anterior"
          onClick={() => {
            onShowMonth(month.previous());
          }}
        >
          ‹
        </button>
        <h2 aria-live="polite">{month.label}</h2>
        <button
          className="icon-button"
          type="button"
          aria-label="Próximo mês"
          onClick={() => {
            onShowMonth(month.next());
          }}
        >
          ›
        </button>
      </div>
      <button
        className="secondary-button secondary-button--compact"
        type="button"
        onClick={onShowToday}
      >
        Hoje
      </button>
    </div>
  );
}
