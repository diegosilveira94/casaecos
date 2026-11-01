import { Box } from '@mui/material';

import type { PersonResponse } from '@casaecos/shared-types';

import { ChoiceCard } from '../../../shared/ui/ChoiceCard.js';
import { FieldGroup } from '../../../shared/ui/FieldGroup.js';
import { FormSelect } from '../../../shared/ui/FormSelect.js';
import type { HomePeople } from '../../shared/home/hooks/use-home-people.js';
import {
  isDriver,
  isSheltered,
  PARTICIPATION_TYPE_IDS,
  type EventFormParticipant,
} from '../domain/event-form.js';

const NOBODY = '';

interface ParticipantsFieldProps {
  /** People of the home picked in the form: the ones offered in the three fields. */
  homePeople: HomePeople;
  /** Drivers of the whole organization, offered whatever the home. */
  drivers: PersonResponse[];
  participants: EventFormParticipant[];
  isDisabled: boolean;
  onChange: (participants: EventFormParticipant[]) => void;
}

interface PersonOption {
  id: number;
  name: string;
}

const STATUS_MESSAGE: Record<Exclude<HomePeople['status'], 'loaded'>, string> = {
  'no-home': 'Escolha a casa para ver as pessoas.',
  loading: 'Carregando pessoas...',
  failed: 'Não foi possível carregar as pessoas.',
};

// Who can drive: the drivers of the organization, then the staff of the home, since
// a caregiver may take the children herself.
function driverCandidates(
  drivers: readonly PersonResponse[],
  staff: readonly PersonResponse[],
): PersonResponse[] {
  const driverIds = new Set(drivers.map(({ id }) => id));
  const staffOutsideDrivers = staff.filter(({ id }) => !driverIds.has(id));
  return [
    ...drivers,
    ...staffOutsideDrivers.filter(isDriver),
    ...staffOutsideDrivers.filter((person) => !isDriver(person)),
  ];
}

// Someone saved in the field who is not of this home still has to show as its value.
function withCurrent(
  options: readonly PersonOption[],
  current: EventFormParticipant | undefined,
): PersonOption[] {
  if (!current || options.some(({ id }) => id === current.personId)) return [...options];
  return [...options, { id: current.personId, name: current.name }];
}

/**
 * Who takes part in the commitment (`person_event`), as one field per role in it:
 * the sheltered children, who is responsible and who drives. The API keeps one role
 * per person in a commitment, so the same person is not offered in two fields.
 * Participants with no field here (an "Organizador" saved before) stay as they are.
 */
export function ParticipantsField({
  homePeople,
  drivers,
  participants,
  isDisabled,
  onChange,
}: ParticipantsFieldProps): React.JSX.Element {
  if (homePeople.status !== 'loaded') {
    return (
      <FieldGroup legend="Pessoas envolvidas" hint={STATUS_MESSAGE[homePeople.status]}>
        {null}
      </FieldGroup>
    );
  }

  const sheltered = homePeople.people.filter(isSheltered);
  const staff = homePeople.people.filter((person) => !isSheltered(person));
  const shelteredIds = new Set(sheltered.map(({ id }) => id));
  const isStaffIn = (participationTypeId: number) => (participant: EventFormParticipant) =>
    participant.participationTypeId === participationTypeId &&
    !shelteredIds.has(participant.personId);

  const responsible = participants.find(isStaffIn(PARTICIPATION_TYPE_IDS.responsible));
  const driver = participants.find(isStaffIn(PARTICIPATION_TYPE_IDS.driver));
  const toggleSheltered = (person: PersonResponse, isChecked: boolean): void => {
    const withoutPerson = participants.filter(({ personId }) => personId !== person.id);
    onChange(
      isChecked
        ? [
            ...withoutPerson,
            {
              personId: person.id,
              name: person.name,
              participationTypeId: PARTICIPATION_TYPE_IDS.participant,
            },
          ]
        : withoutPerson,
    );
  };

  const assign = (
    previous: EventFormParticipant | undefined,
    participationTypeId: number,
    options: readonly PersonOption[],
    selectedValue: string,
  ): void => {
    const chosen = options.find(({ id }) => String(id) === selectedValue);
    const remaining = participants.filter(
      (participant) => participant !== previous && participant.personId !== chosen?.id,
    );
    onChange(
      chosen
        ? [...remaining, { personId: chosen.id, name: chosen.name, participationTypeId }]
        : remaining,
    );
  };

  const responsibleOptions = withCurrent(
    staff.filter(({ id }) => id !== driver?.personId),
    responsible,
  );
  const driverOptions = withCurrent(
    driverCandidates(drivers, staff).filter(({ id }) => id !== responsible?.personId),
    driver,
  );

  return (
    <>
      <FieldGroup
        legend="Acolhidos"
        hint={sheltered.length === 0 ? 'Nenhum acolhido vinculado a esta casa.' : undefined}
      >
        <Box
          sx={{
            display: 'grid',
            gap: 1,
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
            },
          }}
        >
          {sheltered.map((person) => (
            <ChoiceCard
              key={person.id}
              kind="checkbox"
              label={person.name}
              isChecked={participants.some(({ personId }) => personId === person.id)}
              isDisabled={isDisabled}
              onChange={(isChecked) => {
                toggleSheltered(person, isChecked);
              }}
            />
          ))}
        </Box>
      </FieldGroup>

      <FormSelect
        label="Responsável"
        value={responsible?.personId ?? NOBODY}
        disabled={isDisabled}
        onChange={(event) => {
          assign(
            responsible,
            PARTICIPATION_TYPE_IDS.responsible,
            responsibleOptions,
            event.target.value,
          );
        }}
      >
        <option value={NOBODY}>Ninguém</option>
        {responsibleOptions.map(({ id, name }) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </FormSelect>

      <FormSelect
        label="Motorista"
        value={driver?.personId ?? NOBODY}
        disabled={isDisabled}
        onChange={(event) => {
          assign(driver, PARTICIPATION_TYPE_IDS.driver, driverOptions, event.target.value);
        }}
      >
        <option value={NOBODY}>Sem motorista</option>
        {driverOptions.map(({ id, name }) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </FormSelect>
    </>
  );
}
