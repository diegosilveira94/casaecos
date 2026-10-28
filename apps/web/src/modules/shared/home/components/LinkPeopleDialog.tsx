import { useState } from 'react';

import type { HomeResponse, PersonResponse } from '@casaecos/shared-types';

import { ApiRequestError } from '../../../../shared/http/api-request-error.js';
import { AlertMessage } from '../../../../shared/ui/AlertMessage.js';
import { Dialog } from '../../../../shared/ui/Dialog.js';
import { isStaff } from '../../person/domain/roles.js';
import { homeService } from '../services/home-service.js';

const LINK_ERROR_MESSAGE = 'Não foi possível adicionar todas as pessoas. Tente novamente.';

interface LinkPeopleDialogProps {
  home: HomeResponse;
  /** Registered people not linked to the home yet. */
  candidates: readonly PersonResponse[];
  /** Some link reached the API: the home has to be read again. */
  onStored: () => void;
  onClose: () => void;
}

interface CandidateGroupProps {
  legend: string;
  people: readonly PersonResponse[];
  selectedIds: readonly number[];
  isDisabled: boolean;
  onToggle: (personId: number, isSelected: boolean) => void;
}

function CandidateGroup({
  legend,
  people,
  selectedIds,
  isDisabled,
  onToggle,
}: CandidateGroupProps): React.JSX.Element | null {
  if (people.length === 0) return null;

  return (
    <fieldset>
      <legend>{legend}</legend>
      <div className="person-chips">
        {people.map((person) => (
          <label key={person.id} className="person-chip">
            <input
              type="checkbox"
              checked={selectedIds.includes(person.id)}
              disabled={isDisabled}
              onChange={(inputEvent) => {
                onToggle(person.id, inputEvent.target.checked);
              }}
            />
            <span>{person.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Links people to a home (`home_person`), many at once: one tap each. */
export function LinkPeopleDialog({
  home,
  candidates,
  onStored,
  onClose,
}: LinkPeopleDialogProps): React.JSX.Element {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const toggle = (personId: number, isSelected: boolean): void => {
    setSelectedIds((current) =>
      isSelected ? [...current, personId] : current.filter((id) => id !== personId),
    );
  };

  // One call per person: the API keeps each link in its own route.
  async function linkSelected(): Promise<void> {
    setIsSaving(true);
    setFailure(null);
    let linkedCount = 0;
    try {
      for (const personId of selectedIds) {
        await homeService.linkPerson(home.id, personId);
        linkedCount += 1;
      }
      onStored();
      onClose();
    } catch (error: unknown) {
      if (linkedCount > 0) onStored();
      // What went through leaves the selection; what is left can be tried again.
      setSelectedIds(selectedIds.slice(linkedCount));
      setFailure(error instanceof ApiRequestError ? error.message : LINK_ERROR_MESSAGE);
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      title={`Adicionar à ${home.name}`}
      className="dialog__panel--form"
      onClose={() => {
        if (!isSaving) onClose();
      }}
    >
      <form
        className="event-form"
        noValidate
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          void linkSelected();
        }}
      >
        {candidates.length === 0 ? (
          <p className="form-notice">
            Todas as pessoas cadastradas já estão nesta casa. Cadastre a pessoa em Pessoas primeiro.
          </p>
        ) : (
          <>
            <CandidateGroup
              legend="Acolhidos"
              people={candidates.filter((person) => !isStaff(person.role.id))}
              selectedIds={selectedIds}
              isDisabled={isSaving}
              onToggle={toggle}
            />
            <CandidateGroup
              legend="Equipe"
              people={candidates.filter((person) => isStaff(person.role.id))}
              selectedIds={selectedIds}
              isDisabled={isSaving}
              onToggle={toggle}
            />
            <p className="form-field__hint">
              Não achou? Cadastre a pessoa na aba Pessoas, já marcando esta casa.
            </p>
          </>
        )}
        <footer className="dialog__footer">
          {failure === null ? null : <AlertMessage>{failure}</AlertMessage>}
          <div className="dialog__actions">
            <button className="outline-button" type="button" disabled={isSaving} onClick={onClose}>
              Cancelar
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={isSaving || selectedIds.length === 0}
              aria-busy={isSaving}
            >
              {isSaving ? <span className="spinner" aria-hidden="true" /> : null}
              {isSaving
                ? 'Adicionando...'
                : selectedIds.length > 1
                  ? `Adicionar ${String(selectedIds.length)} pessoas`
                  : 'Adicionar à casa'}
            </button>
          </div>
        </footer>
      </form>
    </Dialog>
  );
}
