import { Button, FormHelperText, Stack } from '@mui/material';
import { useState } from 'react';

import type { RoleResponse, UserAccountListItemResponse } from '@casaecos/shared-types';

import { ApiRequestError } from '../../../../shared/http/api-request-error.js';
import { AlertMessage } from '../../../../shared/ui/AlertMessage.js';
import { Dialog } from '../../../../shared/ui/Dialog.js';
import { RolePicker } from '../../person/components/RolePicker.js';
import { canHaveAccess } from '../../person/domain/roles.js';
import { personService } from '../../person/services/person-service.js';

const SAVE_ERROR_MESSAGE = 'Não foi possível trocar o papel. Tente novamente.';

interface ChangeRoleDialogProps {
  account: UserAccountListItemResponse;
  roles: readonly RoleResponse[];
  onStored: () => void;
  onClose: () => void;
}

/**
 * Changes the role of someone who logs in. It takes effect on their next request:
 * the API reads the role from the database on every request, not from the token.
 */
export function ChangeRoleDialog({
  account,
  roles,
  onStored,
  onClose,
}: ChangeRoleDialogProps): React.JSX.Element {
  const [roleId, setRoleId] = useState(account.role.id);
  const [isSaving, setIsSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function save(): Promise<void> {
    if (roleId === account.role.id) {
      onClose();
      return;
    }

    setIsSaving(true);
    setFailure(null);
    try {
      await personService.update(account.person.id, { roleId });
      onStored();
      onClose();
    } catch (error: unknown) {
      setFailure(error instanceof ApiRequestError ? error.message : SAVE_ERROR_MESSAGE);
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      title="Trocar papel"
      onClose={() => {
        if (!isSaving) onClose();
      }}
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        void save();
      }}
      actions={
        <>
          {failure === null ? null : <AlertMessage>{failure}</AlertMessage>}
          <Button color="inherit" disabled={isSaving} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" loading={isSaving} loadingPosition="start">
            {isSaving ? 'Salvando...' : 'Trocar papel'}
          </Button>
        </>
      }
    >
      <Stack spacing={2.5}>
        <FormHelperText>
          {account.person.name} · {account.email}
        </FormHelperText>
        <RolePicker
          name="account-role"
          legend="Novo papel"
          layout="wide"
          roles={roles.filter((role) => canHaveAccess(role.id))}
          value={roleId}
          isDisabled={isSaving}
          hint="Vale na próxima ação da pessoa no sistema, sem precisar sair e entrar de novo."
          onChange={setRoleId}
        />
      </Stack>
    </Dialog>
  );
}
