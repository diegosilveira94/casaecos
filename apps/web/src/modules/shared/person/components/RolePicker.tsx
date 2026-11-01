import { Box, Typography } from '@mui/material';

import type { RoleResponse } from '@casaecos/shared-types';

import { ChoiceCard } from '../../../../shared/ui/ChoiceCard.js';
import { FieldGroup } from '../../../../shared/ui/FieldGroup.js';
import { toneColors } from '../../../agenda/domain/event-tone.js';
import { roleGuide } from '../domain/roles.js';

interface RolePickerProps {
  /** Groups the radios of the field. */
  name: string;
  legend: string;
  roles: readonly RoleResponse[];
  value: number | null;
  /** `wide` shows what each role can do once logged in, instead of who has it. */
  layout?: 'compact' | 'wide';
  isDisabled?: boolean;
  /** Why a role cannot be picked, shown on it; `undefined` leaves it free. */
  blockedReason?: (roleId: number) => string | undefined;
  error?: string | undefined;
  /** Note under the cards, such as why the whole field is locked. */
  hint?: string | undefined;
  onChange: (roleId: number) => void;
}

/** The role as cards to tap, like the commitment type: no list to open on the phone. */
export function RolePicker({
  name,
  legend,
  roles,
  value,
  layout = 'compact',
  isDisabled = false,
  blockedReason = () => undefined,
  error,
  hint,
  onChange,
}: RolePickerProps): React.JSX.Element {
  return (
    <FieldGroup legend={legend} isRequired error={error} hint={hint}>
      <Box
        sx={{ display: 'grid', gap: 1, gridTemplateColumns: { md: 'repeat(2, minmax(0, 1fr))' } }}
      >
        {roles.map((role) => {
          const guide = roleGuide(role.id);
          const reason = blockedReason(role.id);
          return (
            <ChoiceCard
              key={role.id}
              kind="radio"
              name={name}
              title={reason}
              checkedColors={toneColors(guide.tone)}
              label={
                <>
                  <Typography component="span" sx={{ display: 'block', fontSize: 'inherit' }}>
                    {role.description}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {layout === 'wide' ? guide.access : guide.hint}
                  </Typography>
                </>
              }
              isChecked={value === role.id}
              isDisabled={isDisabled || reason !== undefined}
              onChange={() => {
                onChange(role.id);
              }}
            />
          );
        })}
      </Box>
    </FieldGroup>
  );
}
