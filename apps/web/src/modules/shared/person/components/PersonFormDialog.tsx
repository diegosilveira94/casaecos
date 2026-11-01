import { useState, type SyntheticEvent } from 'react';

import type { HomeResponse, PersonResponse, RoleResponse } from '@casaecos/shared-types';

import { ApiRequestError } from '../../../../shared/http/api-request-error.js';
import { AlertMessage } from '../../../../shared/ui/AlertMessage.js';
import { ConfirmDialog } from '../../../../shared/ui/ConfirmDialog.js';
import { Dialog } from '../../../../shared/ui/Dialog.js';
import { fieldErrorProps } from '../../../../shared/ui/field-error-props.js';
import { FormField } from '../../../../shared/ui/FormField.js';
import { useAuth } from '../../auth/context/use-auth.js';
import {
  emptyPersonForm,
  hasPersonFormChanges,
  PERSON_NAME_MAX_LENGTH,
  PERSON_PHONE_MAX_LENGTH,
  PERSON_REGISTRATION_MAX_LENGTH,
  personFormFrom,
  validatePersonForm,
  type PersonFormValues,
} from '../domain/person-form.js';
import { choosesHomesInPersonForm, ROLE_IDS } from '../domain/roles.js';
import { personFormSaver, PersonHomesSaveError } from '../services/person-form-saver.js';
import { personService } from '../services/person-service.js';
import { RolePicker } from './RolePicker.js';

const SAVE_ERROR_MESSAGE = 'Não foi possível salvar a pessoa. Tente novamente.';
const HOMES_ERROR_MESSAGE =
  'A pessoa foi salva, mas não foi possível atualizar as casas dela. Tente novamente.';
const DELETE_ERROR_MESSAGE = 'Não foi possível excluir a pessoa. Tente novamente.';
const COORDINATOR_ONLY = 'Só a coordenação define coordenadores';

interface PersonFormDialogProps {
  /** The person being edited; `null` registers a new one. */
  person: PersonResponse | null;
  /** Homes the person is linked to now. */
  linkedHomeIds: readonly number[];
  homes: readonly HomeResponse[];
  roles: readonly RoleResponse[];
  /** The person reached the API: the list has to be read again. */
  onStored: () => void;
  onClose: () => void;
}

// A second dialog is on top and answers Escape and the backdrop itself.
const ignoreClose = (): void => undefined;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

/** Registers or edits a person, with their role and homes. */
export function PersonFormDialog({
  person,
  linkedHomeIds,
  homes,
  roles,
  onStored,
  onClose,
}: PersonFormDialogProps): React.JSX.Element {
  const { can } = useAuth();
  const canManageAccess = can('account:manage');
  const [initialValues] = useState<PersonFormValues>(() =>
    person ? personFormFrom(person, linkedHomeIds) : emptyPersonForm(),
  );
  const [values, setValues] = useState(initialValues);
  // After a save that stored the person but not their homes, a new one has an id too.
  const [storedPersonId, setStoredPersonId] = useState(person?.id ?? null);
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<'discard' | 'delete' | null>(null);

  const isEditing = person !== null;
  const errors = wasSubmitted ? validatePersonForm(values) : {};
  // The API answers 403 here (#59): the screen says so before the user tries.
  const isRoleLocked = person?.hasAccount === true && !canManageAccess;

  const change = (changes: Partial<PersonFormValues>): void => {
    setValues((current) => ({ ...current, ...changes }));
  };

  const toggleHome = (homeId: number, isLinked: boolean): void => {
    setValues((current) => ({
      ...current,
      homeIds: isLinked
        ? [...current.homeIds, homeId]
        : current.homeIds.filter((linkedId) => linkedId !== homeId),
    }));
  };

  const requestClose = (): void => {
    if (isSaving || isDeleting) return;
    if (hasPersonFormChanges(initialValues, values)) setConfirmation('discard');
    else onClose();
  };

  async function save(submitEvent: SyntheticEvent<HTMLFormElement>): Promise<void> {
    submitEvent.preventDefault();
    setWasSubmitted(true);
    setFailure(null);
    if (Object.keys(validatePersonForm(values)).length > 0) return;

    setIsSaving(true);
    try {
      await personFormSaver.save(storedPersonId, values);
      onStored();
      onClose();
    } catch (error: unknown) {
      if (error instanceof PersonHomesSaveError) {
        setStoredPersonId(error.personId);
        setFailure(HOMES_ERROR_MESSAGE);
        onStored();
      } else {
        setFailure(errorMessage(error, SAVE_ERROR_MESSAGE));
      }
      setIsSaving(false);
    }
  }

  async function deletePerson(personId: number): Promise<void> {
    setIsDeleting(true);
    try {
      await personService.delete(personId);
      onStored();
      onClose();
    } catch (error: unknown) {
      setFailure(errorMessage(error, DELETE_ERROR_MESSAGE));
      setConfirmation(null);
      setIsDeleting(false);
    }
  }

  const isBusy = isSaving || isDeleting;

  return (
    <>
      <Dialog
        title={isEditing ? 'Editar pessoa' : 'Nova pessoa'}
        className="dialog__panel--form"
        onClose={confirmation === null ? requestClose : ignoreClose}
      >
        <form
          className="event-form"
          noValidate
          onSubmit={(submitEvent) => {
            void save(submitEvent);
          }}
        >
          <FormField id="person-name" label="Nome" isRequired error={errors.name}>
            <input
              id="person-name"
              maxLength={PERSON_NAME_MAX_LENGTH}
              autoComplete="off"
              placeholder="Nome completo"
              value={values.name}
              disabled={isBusy}
              {...fieldErrorProps('person-name', errors.name)}
              onChange={(inputEvent) => {
                change({ name: inputEvent.target.value });
              }}
            />
          </FormField>
          <div className="event-form__row event-form__row--pairs">
            <FormField id="person-registration" label="CPF">
              <input
                id="person-registration"
                inputMode="numeric"
                maxLength={PERSON_REGISTRATION_MAX_LENGTH}
                placeholder="000.000.000-00"
                value={values.individualRegistration}
                disabled={isBusy}
                onChange={(inputEvent) => {
                  change({ individualRegistration: inputEvent.target.value });
                }}
              />
            </FormField>
            <FormField id="person-phone" label="Telefone">
              <input
                id="person-phone"
                type="tel"
                inputMode="tel"
                maxLength={PERSON_PHONE_MAX_LENGTH}
                placeholder="(47) 99999-0000"
                value={values.phone}
                disabled={isBusy}
                onChange={(inputEvent) => {
                  change({ phone: inputEvent.target.value });
                }}
              />
            </FormField>
          </div>
          <RolePicker
            name="person-role"
            legend="Papel"
            roles={roles}
            value={values.roleId}
            isDisabled={isBusy || isRoleLocked}
            blockedReason={(roleId) =>
              roleId === ROLE_IDS.coordinator && !canManageAccess ? COORDINATOR_ONLY : undefined
            }
            error={errors.roleId}
            hint={
              isRoleLocked
                ? 'Esta pessoa acessa o sistema: só a coordenação troca o papel dela.'
                : undefined
            }
            onChange={(roleId) => {
              // Without the field, what was marked must not be saved unseen, and the links the
              // person already has stay: they may have come from the home's page.
              change(
                choosesHomesInPersonForm(roleId)
                  ? { roleId }
                  : { roleId, homeIds: initialValues.homeIds },
              );
            }}
          />
          {values.roleId === null || choosesHomesInPersonForm(values.roleId) ? (
            <fieldset className="type-field">
              <legend>Casas</legend>
              {homes.length === 0 ? (
                <p className="form-field__hint">Nenhuma casa cadastrada ainda.</p>
              ) : (
                <div className="person-chips">
                  {homes.map((home) => (
                    <label key={home.id} className="person-chip">
                      <input
                        type="checkbox"
                        checked={values.homeIds.includes(home.id)}
                        disabled={isBusy}
                        onChange={(inputEvent) => {
                          toggleHome(home.id, inputEvent.target.checked);
                        }}
                      />
                      <span>{home.name}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="form-field__hint">Onde a pessoa mora ou trabalha.</p>
            </fieldset>
          ) : null}
          <footer className="dialog__footer">
            {failure === null ? null : <AlertMessage>{failure}</AlertMessage>}
            <div className="dialog__actions">
              {isEditing ? (
                <button
                  className="outline-button outline-button--danger dialog__delete"
                  type="button"
                  disabled={isBusy}
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
                disabled={isBusy}
                onClick={requestClose}
              >
                Cancelar
              </button>
              <button
                className="primary-button"
                type="submit"
                disabled={isBusy}
                aria-busy={isSaving}
              >
                {isSaving ? <span className="spinner" aria-hidden="true" /> : null}
                {isSaving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar pessoa'}
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
            : 'A pessoa ainda não foi cadastrada. Se sair agora, os dados preenchidos serão perdidos.'}
        </ConfirmDialog>
      ) : null}
      {confirmation === 'delete' && person ? (
        <ConfirmDialog
          title="Excluir pessoa?"
          destructiveLabel={isDeleting ? 'Excluindo...' : 'Excluir'}
          keepLabel="Manter pessoa"
          isBusy={isDeleting}
          onConfirm={() => {
            void deletePerson(person.id);
          }}
          onKeep={() => {
            if (!isDeleting) setConfirmation(null);
          }}
        >
          O cadastro de <strong>{person.name}</strong> sai do sistema. Quem está vinculado a casas
          ou compromissos não pode ser excluído.
        </ConfirmDialog>
      ) : null}
    </>
  );
}
