import { useState, type SyntheticEvent } from 'react';

import type { EventResponse, EventTypeResponse } from '@casaecos/shared-types';

import { ApiRequestError } from '../../../shared/http/api-request-error.js';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog.js';
import { Dialog } from '../../../shared/ui/Dialog.js';
import { fieldErrorProps } from '../../../shared/ui/field-error-props.js';
import { FormField } from '../../../shared/ui/FormField.js';
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

// A second dialog is on top and answers Escape and the backdrop itself.
const ignoreClose = (): void => undefined;

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
        className="dialog__panel--form"
        onClose={confirmation === null && pendingHomeChange === null ? requestClose : ignoreClose}
      >
        <form
          className="event-form"
          noValidate
          onSubmit={(submitEvent) => {
            void save(submitEvent);
          }}
        >
          <FormField id="event-title" label="Título" isRequired error={errors.title}>
            <input
              id="event-title"
              type="text"
              maxLength={EVENT_TITLE_MAX_LENGTH}
              placeholder="Ex.: Consulta pediátrica"
              value={values.title}
              disabled={isSaving}
              required
              onChange={(inputEvent) => {
                change({ title: inputEvent.target.value });
              }}
              {...fieldErrorProps('event-title', errors.title)}
            />
          </FormField>

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
            <div
              className={
                values.endsOnAnotherDay
                  ? 'event-form__row event-form__row--pairs'
                  : 'event-form__row'
              }
            >
              <FormField
                id="event-start-day"
                label="Data"
                isRequired
                error={errors.startDay}
                className={values.endsOnAnotherDay ? '' : 'form-field--wide'}
              >
                <input
                  id="event-start-day"
                  type="date"
                  value={values.startDay}
                  disabled={isSaving}
                  required
                  onChange={(inputEvent) => {
                    change({ startDay: inputEvent.target.value });
                  }}
                  {...fieldErrorProps('event-start-day', errors.startDay)}
                />
              </FormField>
              <FormField id="event-start-time" label="Início" isRequired error={errors.startTime}>
                <input
                  id="event-start-time"
                  type="time"
                  value={values.startTime}
                  disabled={isSaving}
                  required
                  onChange={(inputEvent) => {
                    change({ startTime: inputEvent.target.value });
                  }}
                  {...fieldErrorProps('event-start-time', errors.startTime)}
                />
              </FormField>
              {values.endsOnAnotherDay ? (
                <FormField
                  id="event-end-day"
                  label="Data de término"
                  isRequired
                  error={errors.endDay}
                >
                  <input
                    id="event-end-day"
                    type="date"
                    min={values.startDay}
                    value={values.endDay}
                    disabled={isSaving}
                    required
                    onChange={(inputEvent) => {
                      change({ endDay: inputEvent.target.value });
                    }}
                    {...fieldErrorProps('event-end-day', errors.endDay)}
                  />
                </FormField>
              ) : null}
              <FormField
                id="event-end-time"
                label="Término"
                isRequired={values.endsOnAnotherDay}
                error={errors.endTime}
              >
                <input
                  id="event-end-time"
                  type="time"
                  value={values.endTime}
                  disabled={isSaving}
                  required={values.endsOnAnotherDay}
                  onChange={(inputEvent) => {
                    change({ endTime: inputEvent.target.value });
                  }}
                  {...fieldErrorProps('event-end-time', errors.endTime)}
                />
              </FormField>
            </div>
            <label className="event-form__checkbox">
              <input
                type="checkbox"
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
              Termina em outro dia
            </label>
          </div>

          <FormField id="event-home" label="Casa" isRequired error={errors.homeId}>
            <FormSelect
              id="event-home"
              showsPrompt={values.homeId === null}
              value={values.homeId ?? NO_HOME}
              disabled={isSaving || isCheckingHome}
              required
              onChange={(selectEvent) => {
                const { value } = selectEvent.target;
                void changeHome(value === NO_HOME ? null : Number(value));
              }}
              {...fieldErrorProps('event-home', errors.homeId)}
            >
              <option value={NO_HOME}>Escolha a casa</option>
              {homeOptions.map((home) => (
                <option key={home.id} value={home.id}>
                  {home.name}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField id="event-address" label="Endereço">
            <input
              id="event-address"
              type="text"
              maxLength={EVENT_ADDRESS_MAX_LENGTH}
              placeholder="Ex.: UBS Paranaguamirim"
              value={values.address}
              disabled={isSaving}
              onChange={(inputEvent) => {
                change({ address: inputEvent.target.value });
              }}
            />
          </FormField>

          <ParticipantsField
            homePeople={homePeople}
            drivers={drivers}
            participants={values.participants}
            isDisabled={isSaving}
            onChange={(participants) => {
              change({ participants });
            }}
          />

          <FormField
            id="event-description"
            label="Descrição"
            hint={`${String(values.description.length)}/${String(EVENT_DESCRIPTION_MAX_LENGTH)}`}
          >
            <textarea
              id="event-description"
              rows={3}
              maxLength={EVENT_DESCRIPTION_MAX_LENGTH}
              placeholder="Ex.: Levar a carteirinha de vacinação."
              value={values.description}
              disabled={isSaving}
              onChange={(inputEvent) => {
                change({ description: inputEvent.target.value });
              }}
            />
          </FormField>

          <footer className="dialog__footer">
            {failure === null ? null : (
              <div className="login-error" role="alert">
                <span aria-hidden="true">!</span>
                <p>{failure}</p>
              </div>
            )}
            <div className="dialog__actions">
              {isEditing ? (
                <button
                  className="outline-button outline-button--danger dialog__delete"
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setConfirmation('delete');
                  }}
                >
                  Excluir
                </button>
              ) : null}
              <button
                className="outline-button"
                type="button"
                disabled={isSaving}
                onClick={requestClose}
              >
                Cancelar
              </button>
              <button
                className="primary-button"
                type="submit"
                disabled={isSaving}
                aria-busy={isSaving}
              >
                {isSaving ? <span className="spinner" aria-hidden="true" /> : null}
                {isSaving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Salvar compromisso'}
              </button>
            </div>
          </footer>
        </form>
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
