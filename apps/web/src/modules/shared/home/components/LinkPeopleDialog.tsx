import { Alert, Box, Button, FormHelperText, Stack } from '@mui/material';
import { useState } from 'react';

import type { HomeResponse, PersonResponse } from '@casaecos/shared-types';

import { ApiRequestError } from '../../../../shared/http/api-request-error.js';
import { AlertMessage } from '../../../../shared/ui/AlertMessage.js';
import { ChoiceCard } from '../../../../shared/ui/ChoiceCard.js';
import { Dialog } from '../../../../shared/ui/Dialog.js';
import { FieldGroup } from '../../../../shared/ui/FieldGroup.js';
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
    <FieldGroup legend={legend}>
      <Box
        sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
        }}
      >
        {people.map((person) => (
          <ChoiceCard
            key={person.id}
            kind="checkbox"
            label={person.name}
            isChecked={selectedIds.includes(person.id)}
            isDisabled={isDisabled}
            onChange={(isChecked) => {
              onToggle(person.id, isChecked);
            }}
          />
        ))}
      </Box>
    </FieldGroup>
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
      onClose={() => {
        if (!isSaving) onClose();
      }}
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        void linkSelected();
      }}
      actions={
        <>
          {failure === null ? null : <AlertMessage>{failure}</AlertMessage>}
          <Button color="inherit" disabled={isSaving} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            loading={isSaving}
            loadingPosition="start"
            disabled={selectedIds.length === 0}
          >
            {isSaving
              ? 'Adicionando...'
              : selectedIds.length > 1
                ? `Adicionar ${String(selectedIds.length)} pessoas`
                : 'Adicionar à casa'}
          </Button>
        </>
      }
    >
      <Stack spacing={2.5}>
        {candidates.length === 0 ? (
          <Alert severity="info">
            Todas as pessoas cadastradas já estão nesta casa. Cadastre a pessoa em Pessoas primeiro.
          </Alert>
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
            <FormHelperText>
              Não achou? Cadastre a pessoa na aba Pessoas, já marcando esta casa.
            </FormHelperText>
          </>
        )}
      </Stack>
    </Dialog>
  );
}
