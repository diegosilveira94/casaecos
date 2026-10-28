import type { RoleResponse } from '@casaecos/shared-types';

import { RequiredMark } from '../../../../shared/ui/FormField.js';
import { fieldErrorId } from '../../../../shared/ui/field-error-props.js';
import { roleGuide } from '../domain/roles.js';

interface RolePickerProps {
  /** Also the prefix of the ids of the options and of the error. */
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
    <fieldset
      className="type-field"
      aria-describedby={error === undefined ? undefined : fieldErrorId(name)}
    >
      <legend>
        {legend}
        <RequiredMark />
      </legend>
      <div
        className={[
          'role-picker',
          layout === 'wide' ? 'role-picker--wide' : '',
          error === undefined ? '' : 'role-picker--invalid',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {roles.map((role) => {
          const guide = roleGuide(role.id);
          const reason = blockedReason(role.id);
          return (
            <label key={role.id} className={`role-option event-tone--${guide.tone}`} title={reason}>
              <input
                className="visually-hidden"
                type="radio"
                name={name}
                value={role.id}
                checked={value === role.id}
                disabled={isDisabled || reason !== undefined}
                onChange={() => {
                  onChange(role.id);
                }}
              />
              <span>{role.description}</span>
              <small>{layout === 'wide' ? guide.access : guide.hint}</small>
            </label>
          );
        })}
      </div>
      {error === undefined ? null : (
        <p className="form-field__error" id={fieldErrorId(name)}>
          {error}
        </p>
      )}
      {hint === undefined ? null : <p className="form-field__hint">{hint}</p>}
    </fieldset>
  );
}
