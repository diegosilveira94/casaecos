import { useEffect, useState, type SyntheticEvent } from 'react';

import type { UserAccountListItemResponse } from '@casaecos/shared-types';

import { ApiRequestError } from '../../../../shared/http/api-request-error.js';
import { Dialog } from '../../../../shared/ui/Dialog.js';
import { fieldErrorProps } from '../../../../shared/ui/field-error-props.js';
import { FormField } from '../../../../shared/ui/FormField.js';
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

function SubmissionMessage({ kind, children }: { kind: 'error' | 'success'; children: string }) {
  return (
    <div
      className={`form-message form-message--${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      <span aria-hidden="true">{kind === 'error' ? '!' : '✓'}</span>
      <p>{children}</p>
    </div>
  );
}

function SuccessContent({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="password-success">
      <SubmissionMessage kind="success">{message}</SubmissionMessage>
      <button className="primary-button" type="button" onClick={onClose}>
        Concluir
      </button>
    </div>
  );
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
      className="dialog__panel--password"
      onClose={isSaving ? () => undefined : onClose}
    >
      {success ? (
        <SuccessContent message={success} onClose={onClose} />
      ) : (
        <form className="password-form" onSubmit={(event) => void submit(event)} noValidate>
          <p className="password-form__intro">
            Defina uma nova senha para alguém que possui acesso ao sistema.
          </p>
          {accountsFailure ? (
            <SubmissionMessage kind="error">{accountsFailure}</SubmissionMessage>
          ) : null}
          <FormField id="account-person" label="Pessoa" isRequired error={personError}>
            <FormSelect
              id="account-person"
              name="personId"
              value={personId}
              showsPrompt={!personId}
              onChange={(event) => {
                setPersonId(event.target.value);
              }}
              disabled={accounts === null || accounts.length === 0 || isSaving}
              {...fieldErrorProps('account-person', personError)}
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
          </FormField>
          <NewPasswordFields
            values={values}
            errors={errors}
            disabled={isSaving || accounts === null || accounts.length === 0}
            onChange={setValues}
          />
          {failure ? <SubmissionMessage kind="error">{failure}</SubmissionMessage> : null}
          <PasswordActions
            isSaving={isSaving}
            isDisabled={accounts === null || accounts.length === 0}
            onCancel={onClose}
            label="Redefinir senha"
          />
        </form>
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
      <FormField
        id="new-password"
        label="Nova senha"
        isRequired
        error={errors.password}
        hint="Mínimo de 8 caracteres"
      >
        <PasswordInput
          id="new-password"
          name="newPassword"
          autoComplete="new-password"
          value={values.password}
          onChange={(event) => {
            onChange({ ...values, password: event.target.value });
          }}
          disabled={disabled}
          {...fieldErrorProps('new-password', errors.password)}
        />
      </FormField>
      <FormField
        id="confirm-password"
        label="Confirmar nova senha"
        isRequired
        error={errors.confirmation}
      >
        <PasswordInput
          id="confirm-password"
          name="passwordConfirmation"
          autoComplete="new-password"
          value={values.confirmation}
          onChange={(event) => {
            onChange({ ...values, confirmation: event.target.value });
          }}
          disabled={disabled}
          {...fieldErrorProps('confirm-password', errors.confirmation)}
        />
      </FormField>
    </>
  );
}

function PasswordActions({
  isSaving,
  isDisabled = false,
  onCancel,
  label,
}: {
  isSaving: boolean;
  isDisabled?: boolean;
  onCancel: () => void;
  label: string;
}) {
  return (
    <div className="password-form__actions">
      <button className="outline-button" type="button" onClick={onCancel} disabled={isSaving}>
        Cancelar
      </button>
      <button
        className="primary-button"
        type="submit"
        disabled={isSaving || isDisabled}
        aria-busy={isSaving}
      >
        {isSaving ? <span className="spinner" aria-hidden="true" /> : null}
        {isSaving ? 'Salvando...' : label}
      </button>
    </div>
  );
}
