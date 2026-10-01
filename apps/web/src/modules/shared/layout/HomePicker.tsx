import { BuildingIcon, ChevronDownIcon } from '../../../shared/ui/icons.js';
import { useHomeSelection } from '../home/context/use-home-selection.js';

const ALL_HOMES = '';

/** Home filter of the whole logged-in area, at the foot of the sidebar like the prototype. */
export function HomePicker(): React.JSX.Element {
  const { homes, selectedHomeId, canChooseHome, selectHome } = useHomeSelection();
  // With a single home there is nothing to pick, but the picker still names it.
  const onlyHome = homes.length === 1 ? homes[0] : undefined;

  return (
    <label className="home-picker">
      <span className="visually-hidden">Casa</span>
      <BuildingIcon />
      <select
        value={selectedHomeId ?? ALL_HOMES}
        disabled={!canChooseHome}
        onChange={(event) => {
          selectHome(event.target.value === ALL_HOMES ? null : Number(event.target.value));
        }}
      >
        {onlyHome ? (
          <option value={ALL_HOMES}>{onlyHome.name}</option>
        ) : (
          <option value={ALL_HOMES}>Todas as casas</option>
        )}
        {canChooseHome
          ? homes.map((home) => (
              <option key={home.id} value={home.id}>
                {home.name}
              </option>
            ))
          : null}
      </select>
      <ChevronDownIcon />
    </label>
  );
}
