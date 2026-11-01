import { InputAdornment, TextField } from '@mui/material';

import { BuildingIcon } from '../../../shared/ui/icons.js';
import { useHomeSelection } from '../home/context/use-home-selection.js';

const ALL_HOMES = '';

/** Home filter of the whole logged-in area, at the foot of the sidebar like the prototype. */
export function HomePicker(): React.JSX.Element {
  const { homes, selectedHomeId, canChooseHome, selectHome } = useHomeSelection();
  // With a single home there is nothing to pick, but the picker still names it.
  const onlyHome = homes.length === 1 ? homes[0] : undefined;

  return (
    <TextField
      select
      size="small"
      label="Casa"
      value={selectedHomeId ?? ALL_HOMES}
      disabled={!canChooseHome}
      onChange={(event) => {
        selectHome(event.target.value === ALL_HOMES ? null : Number(event.target.value));
      }}
      slotProps={{
        select: { native: true },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <BuildingIcon fontSize="small" />
            </InputAdornment>
          ),
        },
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
    </TextField>
  );
}
