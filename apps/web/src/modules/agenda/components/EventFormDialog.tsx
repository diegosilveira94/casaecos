import { Box, Button, Checkbox, FormControlLabel, Stack, TextField } from '@mui/material';
import { useState, type SyntheticEvent } from 'react';

import type { EventResponse, EventTypeResponse } from '@casaecos/shared-types';

import { ApiRequestError } from '../../../shared/http/api-request-error.js';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog.js';
import { Dialog } from '../../../shared/ui/Dialog.js';
import { AlertMessage } from '../../../shared/ui/AlertMessage.js';
import { FormDatePicker } from '../../../shared/ui/FormDatePicker.js';
import { FormSelect } from '../../../shared/ui/FormSelect.js';
import { useHomeSelection } from '../../shared/home/context/use-home-selection.js';
import { useHomePeople } from '../../shared/home/hooks/use-home-people.js';
import { homeService } from '../../shared/home/services/home-service.js';
import {
  emptyEventForm,
  EVENT_ADDRESS_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_TITLE_MAX_LENGTH,
  eventFormFrom,
  hasEventFormChanges,
  isSheltered,
  participantsLeftBehind,
  validateEventForm,
  type EventFormParticipant,
  type EventFormValues,
} from '../domain/event-form.js';
import { useDrivers } from '../hooks/use-drivers.js';
import { eventFormSaver, EventParticipantsSaveError } from '../services/event-form-saver.js';
import { eventService } from '../services/event-service.js';
import { EventTypePicker } from './EventTypePicker.js';
import { ParticipantsField } from './ParticipantsField.js';

const NO_HOME = '';
const SAVE_ERROR_MESSAGE = 'Não foi possível salvar o compromisso. Tente novamente.';
const PARTICIPANTS_ERROR_MESSAGE =
  'O compromisso foi salvo, mas não foi possível atualizar as pessoas envolvidas. Tente novamente.';
const DELETE_ERROR_MESSAGE = 'Não foi possível excluir o compromisso. Tente novamente.';

interface EventFormDialogProps {
  /** The commitment being edited; `null` creates a new one. */
  event: EventResponse | null;
  /** Day a new commitment starts on: the one picked in the agenda. */
  initialDay: Date;
  eventTypes: EventTypeResponse[];
  onSaved: (savedEvent: EventResponse) => void;
  onDeleted: () => void;
  /** The commitment reached the API but the dialog stays open (its people failed). */
  onStored: () => void;
  onClose: () => void;
}

/** A home picked in the form that would take people out of the commitment. */
interface PendingHomeChange {
  homeId: number;
  leaving: EventFormParticipant[];
  removesSheltered: boolean;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

/** Creates or edits a commitment: bottom sheet on the phone, modal from 52rem. */
export function EventFormDialog({
  event,
  initialDay,
  eventTypes,
  onSaved,
  onDeleted,
  onStored,
  onClose,
}: EventFormDialogProps): React.JSX.Element {
  const { homes, selectedHomeId } = useHomeSelection();
  const onlyHomeId = homes.length === 1 ? (homes[0]?.id ?? null) : null;
  const [initialValues] = useState<EventFormValues>(() =>
    event ? eventFormFrom(event) : emptyEventForm(initialDay, selectedHomeId ?? onlyHomeId),
  );
  const [values, setValues] = useState(initialValues);
  // After a save that stored the commitment but not its people, a new one has an id too.
  const [storedEventId, setStoredEventId] = useState(event?.id ?? null);
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<'discard' | 'delete' | null>(null);
  const [isCheckingHome, setIsCheckingHome] = useState(false);
  const [pendingHomeChange, setPendingHomeChange] = useState<PendingHomeChange | null>(null);

  const homePeople = useHomePeople(values.homeId);
  const drivers = useDrivers();

  const isEditing = event !== null;
  const errors = wasSubmitted ? validateEventForm(values) : {};
  // The home of an edited commitment stays listed even if the home lookup failed.
  const homeOptions =
    event && !homes.some(({ id }) => id === event.home.id) ? [...homes, event.home] : homes;

  const change = (changes: Partial<EventFormValues>): void => {
    setValues((current) => ({ ...current, ...changes }));
  };

  // People are offered by home, so the ones only the old home has would be left in the
  // commitment with no field to show them. The change asks before taking them out.
  async function changeHome(homeId: number | null): Promise<void> {
    const oldHomePeople = homePeople.status === 'loaded' ? homePeople.people : [];
    if (homeId === null || oldHomePeople.length === 0 || values.participants.length === 0) {
      change({ homeId });
      return;
    }

    setIsCheckingHome(true);
    try {
      const newHomePeople = await homeService.listPeople(homeId);
      const leaving = participantsLeftBehind(values.participants, oldHomePeople, newHomePeople);
      if (leaving.length === 0) {
        change({ homeId });
      } else {
        const shelteredIds = new Set(oldHomePeople.filter(isSheltered).map(({ id }) => id));
        setPendingHomeChange({
          homeId,
          leaving,
          removesSheltered: leaving.some(({ personId }) => shelteredIds.has(personId)),
        });
      }
    } catch {
      // Without the people of the new home nobody is removed blind: the fields say so.
      change({ homeId });
    } finally {
      setIsCheckingHome(false);
    }
  }

  const confirmHomeChange = ({ homeId, leaving }: PendingHomeChange): void => {
    const leavingIds = new Set(leaving.map(({ personId }) => personId));
    setValues((current) => ({
      ...current,
      homeId,
      participants: current.participants.filter(({ personId }) => !leavingIds.has(personId)),
    }));
    setPendingHomeChange(null);
  };

  // Every way out (Cancelar, "Fechar", the backdrop, Escape) asks before losing changes.
  const requestClose = (): void => {
    if (isSaving) return;
    if (hasEventFormChanges(initialValues, values)) setConfirmation('discard');
    else onClose();
  };

  async function save(submitEvent: SyntheticEvent<HTMLFormElement>): Promise<void> {
    submitEvent.preventDefault();
    setWasSubmitted(true);
    setFailure(null);
    if (Object.keys(validateEventForm(values)).length > 0) return;

    setIsSaving(true);
    try {
      onSaved(await eventFormSaver.save(storedEventId, values));
    } catch (error: unknown) {
      if (error instanceof EventParticipantsSaveError) {
        setStoredEventId(error.eventId);
        setFailure(PARTICIPANTS_ERROR_MESSAGE);
        onStored();
      } else {
        setFailure(errorMessage(error, SAVE_ERROR_MESSAGE));
      }
      setIsSaving(false);
    }
  }

  async function deleteEvent(eventId: number): Promise<void> {
    setIsDeleting(true);
    try {
      await eventService.delete(eventId);
      onDeleted();
    } catch (error: unknown) {
      setFailure(errorMessage(error, DELETE_ERROR_MESSAGE));
      setConfirmation(null);
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Dialog
        title={isEditing ? 'Editar compromisso' : 'Novo compromisso'}
        onClose={requestClose}
        onSubmit={(submitEvent) => {
          void save(submitEvent);
        }}
        actions={
          <>
            {failure === null ? null : <AlertMessage>{failure}</AlertMessage>}
            {isEditing ? (
              <Button
                sx={{ mr: 'auto' }}
                color="error"
                variant="contained"
                disabled={isSaving}
                onClick={() => {
                  setConfirmation('delete');
                }}
              >
                Excluir
              </Button>
            ) : null}
            <Button color="inherit" disabled={isSaving} onClick={requestClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" loading={isSaving} loadingPosition="start">
              {isSaving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Salvar compromisso'}
            </Button>
          </>
        }
      >
        <Stack spacing={2.5}>
          <TextField
            label="Título"
            required
            error={errors.title !== undefined}
            helperText={errors.title}
            placeholder="Ex.: Consulta pediátrica"
            value={values.title}
            disabled={isSaving}
            slotProps={{ htmlInput: { maxLength: EVENT_TITLE_MAX_LENGTH } }}
            onChange={(inputEvent) => {
              change({ title: inputEvent.target.value });
            }}
          />

          <EventTypePicker
            eventTypes={eventTypes}
            eventTypeId={values.eventTypeId}
            error={errors.eventTypeId}
            isDisabled={isSaving}
            onChange={(eventTypeId) => {
              change({ eventTypeId });
            }}
          />

          <div>
            <Box
              sx={{
                display: 'grid',
                gap: '1rem 0.75rem',
                alignItems: 'start',
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  md: values.endsOnAnotherDay
                    ? 'repeat(2, minmax(0, 1fr))'
                    : 'minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr)',
                },
              }}
            >
              <FormDatePicker
                label="Data"
                isRequired
                value={values.startDay}
                error={errors.startDay}
                isDisabled={isSaving}
                isWideOnPhone={!values.endsOnAnotherDay}
                onChange={(startDay) => {
                  change({ startDay });
                }}
              />
              <TextField
                label="Início"
                type="time"
                required
                error={errors.startTime !== undefined}
                helperText={errors.startTime}
                value={values.startTime}
                disabled={isSaving}
                onChange={(inputEvent) => {
                  change({ startTime: inputEvent.target.value });
                }}
              />
              {values.endsOnAnotherDay ? (
                <FormDatePicker
                  label="Data de término"
                  isRequired
                  minDay={values.startDay}
                  value={values.endDay}
                  error={errors.endDay}
                  isDisabled={isSaving}
                  onChange={(endDay) => {
                    change({ endDay });
                  }}
                />
              ) : null}
              <TextField
                label="Término"
                type="time"
                required={values.endsOnAnotherDay}
                error={errors.endTime !== undefined}
                helperText={errors.endTime}
                value={values.endTime}
                disabled={isSaving}
                onChange={(inputEvent) => {
                  change({ endTime: inputEvent.target.value });
                }}
              />
            </Box>
            <FormControlLabel
              label="Termina em outro dia"
              control={
                <Checkbox
                  checked={values.endsOnAnotherDay}
                  disabled={isSaving}
                  onChange={(inputEvent) => {
                    const endsOnAnotherDay = inputEvent.target.checked;
                    change({
                      endsOnAnotherDay,
                      endDay: endsOnAnotherDay ? values.endDay || values.startDay : '',
                    });
                  }}
                />
              }
            />
          </div>

          <FormSelect
            label="Casa"
            required
            error={errors.homeId !== undefined}
            helperText={errors.homeId}
            value={values.homeId ?? NO_HOME}
            disabled={isSaving || isCheckingHome}
            onChange={(selectEvent) => {
              const { value } = selectEvent.target;
              void changeHome(value === NO_HOME ? null : Number(value));
            }}
          >
            <option value={NO_HOME}>Escolha a casa</option>
            {homeOptions.map((home) => (
              <option key={home.id} value={home.id}>
                {home.name}
              </option>
            ))}
          </FormSelect>

          <TextField
            label="Endereço"
            placeholder="Ex.: UBS Paranaguamirim"
            value={values.address}
            disabled={isSaving}
            slotProps={{ htmlInput: { maxLength: EVENT_ADDRESS_MAX_LENGTH } }}
            onChange={(inputEvent) => {
              change({ address: inputEvent.target.value });
            }}
          />

          <ParticipantsField
            homePeople={homePeople}
            drivers={drivers}
            participants={values.participants}
            isDisabled={isSaving}
            onChange={(participants) => {
              change({ participants });
            }}
          />

          <TextField
            label="Descrição"
            multiline
            rows={3}
            helperText={`${String(values.description.length)}/${String(EVENT_DESCRIPTION_MAX_LENGTH)}`}
            placeholder="Ex.: Levar a carteirinha de vacinação."
            value={values.description}
            disabled={isSaving}
            slotProps={{ htmlInput: { maxLength: EVENT_DESCRIPTION_MAX_LENGTH } }}
            onChange={(inputEvent) => {
              change({ description: inputEvent.target.value });
            }}
          />
        </Stack>
      </Dialog>

      {confirmation === 'discard' ? (
        <ConfirmDialog
          title="Descartar alterações?"
          destructiveLabel="Descartar"
          keepLabel="Continuar editando"
          onConfirm={onClose}
          onKeep={() => {
            setConfirmation(null);
          }}
        >
          {isEditing
            ? 'Você fez alterações que ainda não foram salvas. Se sair agora, elas serão perdidas.'
            : 'O compromisso ainda não foi salvo. Se sair agora, os dados preenchidos serão perdidos.'}
        </ConfirmDialog>
      ) : null}

      {pendingHomeChange ? (
        <ConfirmDialog
          title="Trocar a casa?"
          destructiveLabel="Trocar a casa"
          keepLabel="Manter a casa"
          onConfirm={() => {
            confirmHomeChange(pendingHomeChange);
          }}
          onKeep={() => {
            setPendingHomeChange(null);
          }}
        >
          {pendingHomeChange.removesSheltered
            ? 'Trocar a casa remove os acolhidos já vinculados. Continuar?'
            : 'Trocar a casa remove as pessoas já vinculadas. Continuar?'}
        </ConfirmDialog>
      ) : null}

      {confirmation === 'delete' && event ? (
        <ConfirmDialog
          title="Excluir compromisso?"
          destructiveLabel={isDeleting ? 'Excluindo...' : 'Excluir'}
          keepLabel="Manter compromisso"
          isBusy={isDeleting}
          onConfirm={() => {
            void deleteEvent(event.id);
          }}
          onKeep={() => {
            if (!isDeleting) setConfirmation(null);
          }}
        >
          <strong>{event.title}</strong> será excluído da agenda. Essa ação não pode ser desfeita.
        </ConfirmDialog>
      ) : null}
    </>
  );
}
