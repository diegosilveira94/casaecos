import { ChevronLeftIcon, ChevronRightIcon } from '../../../shared/ui/icons.js';
import type { AgendaView } from '../domain/calendar-period.js';

interface AgendaNavigationProps {
  view: AgendaView;
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  onShowToday: () => void;
  onChangeView: (view: AgendaView) => void;
}

const VIEW_LABELS: Record<AgendaView, string> = {
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
};

export function AgendaNavigation({
  view,
  label,
  onPrevious,
  onNext,
  onShowToday,
  onChangeView,
}: AgendaNavigationProps): React.JSX.Element {
  const periodName = VIEW_LABELS[view].toLocaleLowerCase('pt-BR');

  return (
    <div className="month-navigation">
      <div className="month-navigation__controls">
        <div className="button-group">
          <button type="button" aria-label={`${VIEW_LABELS[view]} anterior`} onClick={onPrevious}>
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            aria-label={`Próxim${view === 'week' ? 'a' : 'o'} ${periodName}`}
            onClick={onNext}
          >
            <ChevronRightIcon />
          </button>
        </div>
        <button className="outline-button" type="button" onClick={onShowToday}>
          Hoje
        </button>
      </div>

      <h2 aria-live="polite">{label}</h2>

      <div className="button-group month-navigation__views" role="group" aria-label="Visão">
        {(Object.entries(VIEW_LABELS) as [AgendaView, string][]).map(([candidate, name]) => (
          <button
            key={candidate}
            type="button"
            aria-pressed={view === candidate}
            onClick={() => {
              onChangeView(candidate);
            }}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
