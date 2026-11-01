import { useState, type SyntheticEvent } from 'react';

import type { HomeResponse, PersonResponse } from '@casaecos/shared-types';

import { ApiRequestError } from '../../../../shared/http/api-request-error.js';
import { useApiResource } from '../../../../shared/http/use-api-resource.js';
import { AlertMessage } from '../../../../shared/ui/AlertMessage.js';
import { ConfirmDialog } from '../../../../shared/ui/ConfirmDialog.js';
import { Dialog } from '../../../../shared/ui/Dialog.js';
import { fieldErrorProps } from '../../../../shared/ui/field-error-props.js';
import { FormField } from '../../../../shared/ui/FormField.js';
import { FormSelect } from '../../../../shared/ui/FormSelect.js';
import { organizationService } from '../../organization/services/organization-service.js';
import { canBeResponsible } from '../../person/domain/roles.js';
import { homeFormSaver, HomeResponsibleLinkError } from '../services/home-form-saver.js';
import { homeService } from '../services/home-service.js';

// Column size of `home.name` (schema.prisma), which the API also validates.
const HOME_NAME_MAX_LENGTH = 100;
const NOBODY = '';
const SAVE_ERROR_MESSAGE = 'Não foi possível salvar a casa. Tente novamente.';
const DELETE_ERROR_MESSAGE = 'Não foi possível excluir a casa. Tente novamente.';
const NO_ORGANIZATION_MESSAGE =
  'Nenhuma organização cadastrada. Peça ao suporte técnico para configurar o sistema.';

interface HomeFormDialogProps {
  /** The home being edited; `null` creates a new one. */
  home: HomeResponse | null;
  /** Who is linked to the home now: a responsible outside it gets linked on save. */
  memberIds: readonly number[];
  /** Everyone registered: the responsible is picked among the staff. */
  people: readonly PersonResponse[];
  onSaved: (home: HomeResponse) => void;
  onDeleted: () => void;
  onClose: () => void;
}

const ignoreClose = (): void => undefined;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

/** Creates or edits a home: its name and who answers for it. */
export function HomeFormDialog({
  home,
  memberIds,
  people,
  onSaved,
  onDeleted,
  onClose,
}: HomeFormDialogProps): React.JSX.Element {
  const isEditing = home !== null;
  // A new home needs an organization; an edited one keeps its own.
  const organizations = useApiResource(`organizations:${String(isEditing)}`, () =>
    isEditing ? Promise.resolve([]) : organizationService.list(),
  );
  const [name, setName] = useState(home?.name ?? '');
  const [responsibleId, setResponsibleId] = useState<number | null>(home?.responsible.id ?? null);
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<'discard' | 'delete' | null>(null);

  const errors = {
    ...(wasSubmitted && name.trim() === '' ? { name: 'Informe o nome da casa.' } : {}),
    ...(wasSubmitted && responsibleId === null ? { responsible: 'Escolha o responsável.' } : {}),
  };
  const staff = people.filter((person) => canBeResponsible(person.role.id));
  // The saved responsible stays listed even if their role changed since.
  const responsibleOptions =
    home && !staff.some(({ id }) => id === home.responsible.id)
      ? [...staff, home.responsible]
      : staff;
  // The system serves one NGO today, so a new home goes to the one organization there
  // is. A picker comes with the second NGO, like the rest of the multi-NGO model.
  const organizationId =
    home?.organization.id ??
    (organizations.resource.status === 'loaded' ? organizations.resource.data[0]?.id : undefined);
  const hasChanges =
    name !== (home?.name ?? '') || responsibleId !== (home?.responsible.id ?? null);
  const isBusy = isSaving || isDeleting;

  const requestClose = (): void => {
    if (isBusy) return;
    if (hasChanges) setConfirmation('discard');
    else onClose();
  };

  async function save(submitEvent: SyntheticEvent<HTMLFormElement>): Promise<void> {
    submitEvent.preventDefault();
    setWasSubmitted(true);
    setFailure(null);
    if (name.trim() === '' || responsibleId === null) return;
    if (organizationId === undefined) {
      setFailure(NO_ORGANIZATION_MESSAGE);
      return;
    }

    setIsSaving(true);
    try {
      onSaved(
        await homeFormSaver.save(
          home?.id ?? null,
          { name, responsibleId, organizationId },
          memberIds,
        ),
      );
    } catch (error: unknown) {
      if (error instanceof HomeResponsibleLinkError) {
        onSaved(error.home);
        return;
      }
      setFailure(errorMessage(error, SAVE_ERROR_MESSAGE));
      setIsSaving(false);
    }
  }

  async function deleteHome(homeId: number): Promise<void> {
    setIsDeleting(true);
    try {
      await homeService.delete(homeId);
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
        title={isEditing ? 'Editar casa' : 'Nova casa'}
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
          <FormField id="home-name" label="Nome da casa" isRequired error={errors.name}>
            <input
              id="home-name"
              maxLength={HOME_NAME_MAX_LENGTH}
              autoComplete="off"
              placeholder="Ex.: Casa Esperança"
              value={name}
              disabled={isBusy}
              {...fieldErrorProps('home-name', errors.name)}
              onChange={(inputEvent) => {
                setName(inputEvent.target.value);
              }}
            />
          </FormField>
          <FormField
            id="home-responsible"
            label="Responsável"
            isRequired
            error={errors.responsible}
            hint={
              staff.length === 0
                ? 'Cadastre a equipe em Pessoas antes de criar a casa.'
                : isEditing
                  ? 'A lista traz a equipe cadastrada em Pessoas.'
                  : 'A lista traz a equipe cadastrada em Pessoas. O responsável já entra vinculado à casa.'
            }
          >
            <FormSelect
              id="home-responsible"
              showsPrompt={responsibleId === null}
              value={responsibleId ?? NOBODY}
              disabled={isBusy}
              {...fieldErrorProps('home-responsible', errors.responsible)}
              onChange={(changeEvent) => {
                const value = changeEvent.target.value;
                setResponsibleId(value === NOBODY ? null : Number(value));
              }}
            >
              <option value={NOBODY}>Escolha quem responde pela casa</option>
              {responsibleOptions.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} · {person.role.description}
                </option>
              ))}
            </FormSelect>
          </FormField>
          {organizations.resource.status === 'failed' ? (
            <AlertMessage>{organizations.resource.message}</AlertMessage>
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
                disabled={isBusy || (!isEditing && organizations.resource.status === 'loading')}
                aria-busy={isSaving}
              >
                {isSaving ? <span className="spinner" aria-hidden="true" /> : null}
                {isSaving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar casa'}
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
            : 'A casa ainda não foi cadastrada. Se sair agora, os dados preenchidos serão perdidos.'}
        </ConfirmDialog>
      ) : null}
      {confirmation === 'delete' && home ? (
        <ConfirmDialog
          title="Excluir casa?"
          destructiveLabel={isDeleting ? 'Excluindo...' : 'Excluir'}
          keepLabel="Manter casa"
          isBusy={isDeleting}
          onConfirm={() => {
            void deleteHome(home.id);
          }}
          onKeep={() => {
            if (!isDeleting) setConfirmation(null);
          }}
        >
          <strong>{home.name}</strong> sai do sistema, com os vínculos das pessoas. Casa com
          compromissos na agenda não pode ser excluída.
        </ConfirmDialog>
      ) : null}
    </>
  );
}
