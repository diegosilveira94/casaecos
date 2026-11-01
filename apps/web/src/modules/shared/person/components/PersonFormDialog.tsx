import { Box, Button, Stack, TextField } from '@mui/material';
import { useState, type SyntheticEvent } from 'react';

import type { HomeResponse, PersonResponse, RoleResponse } from '@casaecos/shared-types';

import { ApiRequestError } from '../../../../shared/http/api-request-error.js';
import { AlertMessage } from '../../../../shared/ui/AlertMessage.js';
import { ConfirmDialog } from '../../../../shared/ui/ConfirmDialog.js';
import { Dialog } from '../../../../shared/ui/Dialog.js';
import { ChoiceCard } from '../../../../shared/ui/ChoiceCard.js';
import { FieldGroup } from '../../../../shared/ui/FieldGroup.js';
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
                disabled={isBusy}
                onClick={() => {
                  setConfirmation('delete');
                }}
              >
                Excluir
              </Button>
            ) : null}
            <Button color="inherit" disabled={isBusy} onClick={requestClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              loading={isSaving}
              loadingPosition="start"
              disabled={isDeleting}
            >
              {isSaving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar pessoa'}
            </Button>
          </>
        }
      >
        <Stack spacing={2.5}>
          <TextField
            label="Nome"
            required
            autoComplete="off"
            placeholder="Nome completo"
            error={errors.name !== undefined}
            helperText={errors.name}
            value={values.name}
            disabled={isBusy}
            slotProps={{ htmlInput: { maxLength: PERSON_NAME_MAX_LENGTH } }}
            onChange={(inputEvent) => {
              change({ name: inputEvent.target.value });
            }}
          />
          <Box
            sx={{
              display: 'grid',
              gap: '1rem 0.75rem',
              alignItems: 'start',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            }}
          >
            <TextField
              label="CPF"
              placeholder="000.000.000-00"
              value={values.individualRegistration}
              disabled={isBusy}
              slotProps={{
                htmlInput: { inputMode: 'numeric', maxLength: PERSON_REGISTRATION_MAX_LENGTH },
              }}
              onChange={(inputEvent) => {
                change({ individualRegistration: inputEvent.target.value });
              }}
            />
            <TextField
              label="Telefone"
              type="tel"
              placeholder="(47) 99999-0000"
              value={values.phone}
              disabled={isBusy}
              slotProps={{ htmlInput: { inputMode: 'tel', maxLength: PERSON_PHONE_MAX_LENGTH } }}
              onChange={(inputEvent) => {
                change({ phone: inputEvent.target.value });
              }}
            />
          </Box>
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
            <FieldGroup
              legend="Casas"
              hint={
                homes.length === 0
                  ? 'Nenhuma casa cadastrada ainda.'
                  : 'Onde a pessoa mora ou trabalha.'
              }
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
                {homes.map((home) => (
                  <ChoiceCard
                    key={home.id}
                    kind="checkbox"
                    label={home.name}
                    isChecked={values.homeIds.includes(home.id)}
                    isDisabled={isBusy}
                    onChange={(isChecked) => {
                      toggleHome(home.id, isChecked);
                    }}
                  />
                ))}
              </Box>
            </FieldGroup>
          ) : null}
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
