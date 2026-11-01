import { Alert, Button, Stack, Typography } from '@mui/material';
import { useEffect, useState, type SyntheticEvent } from 'react';

import type { UserAccountListItemResponse } from '@casaecos/shared-types';

import { ApiRequestError } from '../../../../shared/http/api-request-error.js';
import { Dialog } from '../../../../shared/ui/Dialog.js';
import { FormSelect } from '../../../../shared/ui/FormSelect.js';
import { authService } from '../services/auth-service.js';
import { PasswordInput } from './PasswordInput.js';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72;
const UNEXPECTED_ERROR = 'Não foi possível concluir a solicitação. Tente novamente.';

interface DialogProps {
  onClose: () => void;
}

interface PasswordValues {
  password: string;
  confirmation: string;
}

interface PasswordErrors {
  password?: string;
  confirmation?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof ApiRequestError ? error.message : UNEXPECTED_ERROR;
}

function validateNewPassword(values: PasswordValues): PasswordErrors {
  const errors: PasswordErrors = {};
  if (values.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `A senha precisa de ao menos ${String(PASSWORD_MIN_LENGTH)} caracteres.`;
  } else if (new TextEncoder().encode(values.password).byteLength > PASSWORD_MAX_BYTES) {
    errors.password = `A senha não pode passar de ${String(PASSWORD_MAX_BYTES)} bytes.`;
  }
  if (!values.confirmation) errors.confirmation = 'Confirme a nova senha.';
  else if (values.confirmation !== values.password) {
    errors.confirmation = 'As senhas não coincidem.';
  }
  return errors;
}

export function ResetPasswordDialog({ onClose }: DialogProps): React.JSX.Element {
  const [accounts, setAccounts] = useState<UserAccountListItemResponse[] | null>(null);
  const [accountsFailure, setAccountsFailure] = useState<string | null>(null);
  const [personId, setPersonId] = useState('');
  const [values, setValues] = useState<PasswordValues>({ password: '', confirmation: '' });
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const errors = wasSubmitted ? validateNewPassword(values) : {};
  const personError = wasSubmitted && !personId ? 'Escolha uma pessoa.' : undefined;

  useEffect(() => {
    let isCurrent = true;
    authService.listAccounts().then(
      (loadedAccounts) => {
        if (isCurrent) setAccounts(loadedAccounts);
      },
      (error: unknown) => {
        if (isCurrent) setAccountsFailure(errorMessage(error));
      },
    );
    return () => {
      isCurrent = false;
    };
  }, []);

  async function submit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setWasSubmitted(true);
    setFailure(null);
    if (!personId || Object.keys(validateNewPassword(values)).length > 0) return;

    setIsSaving(true);
    try {
      const response = await authService.resetPassword(Number(personId), {
        password: values.password,
      });
      setSuccess(response.message);
    } catch (error: unknown) {
      setFailure(errorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      title="Redefinir senha"
      onClose={isSaving ? () => undefined : onClose}
      {...(success ? {} : { onSubmit: (event) => void submit(event) })}
      actions={
        success ? (
          <Button variant="contained" onClick={onClose}>
            Concluir
          </Button>
        ) : (
          <>
            {failure ? (
              <Alert severity="error" sx={{ width: '100%' }}>
                {failure}
              </Alert>
            ) : null}
            <Button color="inherit" disabled={isSaving} onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              loading={isSaving}
              loadingPosition="start"
              disabled={accounts === null || accounts.length === 0}
            >
              {isSaving ? 'Salvando...' : 'Redefinir senha'}
            </Button>
          </>
        )
      }
    >
      {success ? (
        <Alert severity="success" role="status">
          {success}
        </Alert>
      ) : (
        <Stack spacing={2}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Defina uma nova senha para alguém que possui acesso ao sistema.
          </Typography>
          {accountsFailure ? <Alert severity="error">{accountsFailure}</Alert> : null}
          <FormSelect
            label="Pessoa"
            required
            name="personId"
            error={personError !== undefined}
            helperText={personError}
            value={personId}
            onChange={(event) => {
              setPersonId(event.target.value);
            }}
            disabled={accounts === null || accounts.length === 0 || isSaving}
          >
            <option value="">
              {accounts === null
                ? 'Carregando pessoas...'
                : accounts.length === 0
                  ? 'Nenhuma credencial cadastrada'
                  : 'Escolha uma pessoa'}
            </option>
            {accounts?.map((account) => (
              <option key={account.person.id} value={account.person.id}>
                {account.person.name} — {account.email}
              </option>
            ))}
          </FormSelect>
          <NewPasswordFields
            values={values}
            errors={errors}
            disabled={isSaving || accounts === null || accounts.length === 0}
            onChange={setValues}
          />
        </Stack>
      )}
    </Dialog>
  );
}

interface NewPasswordFieldsProps {
  values: PasswordValues;
  errors: PasswordErrors;
  disabled: boolean;
  onChange: (values: PasswordValues) => void;
}

function NewPasswordFields({ values, errors, disabled, onChange }: NewPasswordFieldsProps) {
  return (
    <>
      <PasswordInput
        label="Nova senha"
        required
        name="newPassword"
        autoComplete="new-password"
        error={errors.password !== undefined}
        helperText={errors.password ?? 'Mínimo de 8 caracteres'}
        value={values.password}
        onChange={(event) => {
          onChange({ ...values, password: event.target.value });
        }}
        disabled={disabled}
      />
      <PasswordInput
        label="Confirmar nova senha"
        required
        name="passwordConfirmation"
        autoComplete="new-password"
        error={errors.confirmation !== undefined}
        helperText={errors.confirmation}
        value={values.confirmation}
        onChange={(event) => {
          onChange({ ...values, confirmation: event.target.value });
        }}
        disabled={disabled}
      />
    </>
  );
}
