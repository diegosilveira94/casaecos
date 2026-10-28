import { useState, type SyntheticEvent } from 'react';

import type { PersonResponse } from '@casaecos/shared-types';

import { ApiRequestError } from '../../../../shared/http/api-request-error.js';
import { AlertMessage } from '../../../../shared/ui/AlertMessage.js';
import { Dialog } from '../../../../shared/ui/Dialog.js';
import { fieldErrorProps } from '../../../../shared/ui/field-error-props.js';
import { FormField } from '../../../../shared/ui/FormField.js';
import { FormSelect } from '../../../../shared/ui/FormSelect.js';
import { roleGuide } from '../../person/domain/roles.js';
import { temporaryPassword } from '../domain/temporary-password.js';
import { authService } from '../services/auth-service.js';

// Same rule as the API (`password-hasher.ts`) and the login screen.
const PASSWORD_MIN_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOBODY = '';
const SAVE_ERROR_MESSAGE = 'Não foi possível dar o acesso. Tente novamente.';

interface GrantAccessDialogProps {
  /** Staff without a credential yet. */
  candidates: readonly PersonResponse[];
  onStored: () => void;
  onClose: () => void;
}

interface GrantedCredential {
  name: string;
  email: string;
  password: string;
}

interface GrantAccessErrors {
  person?: string;
  email?: string;
  password?: string;
}

function validate(personId: number | null, email: string, password: string): GrantAccessErrors {
  return {
    ...(personId === null ? { person: 'Escolha a pessoa.' } : {}),
    ...(EMAIL_PATTERN.test(email.trim()) ? {} : { email: 'Informe um e-mail válido.' }),
    ...(password.length < PASSWORD_MIN_LENGTH
      ? { password: `A senha precisa de ao menos ${String(PASSWORD_MIN_LENGTH)} caracteres.` }
      : {}),
  };
}

function accessDescription(person: PersonResponse): string {
  const access = roleGuide(person.role.id).access;
  return access === null
    ? 'Escolha da equipe. Acolhidos não entram no sistema.'
    : `Como ${person.role.description}: ${access.toLocaleLowerCase('pt-BR')}.`;
}

/** The password goes on screen once: the API keeps only its hash. */
function CredentialCard({
  credential,
  onClose,
}: {
  credential: GrantedCredential;
  onClose: () => void;
}): React.JSX.Element {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  // The clipboard API is missing outside HTTPS, so it can fail before the promise.
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(
        `E-mail: ${credential.email}\nSenha: ${credential.password}`,
      );
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  };

  return (
    <Dialog title="Acesso criado" className="dialog__panel--form" onClose={onClose}>
      <div className="event-form">
        <p className="form-notice">
          {credential.name} já pode entrar no Casa Ecos. Passe estes dados por um canal seguro: a
          senha não aparece de novo.
        </p>
        <dl className="credential-card">
          <div>
            <dt>E-mail</dt>
            <dd>{credential.email}</dd>
          </div>
          <div>
            <dt>Senha provisória</dt>
            <dd>{credential.password}</dd>
          </div>
        </dl>
        {copyStatus === 'failed' ? (
          <p className="form-field__hint" role="status">
            Não deu para copiar: selecione o texto acima.
          </p>
        ) : null}
        <footer className="dialog__footer">
          <div className="dialog__actions">
            <button
              className="outline-button"
              type="button"
              onClick={() => {
                void copy();
              }}
            >
              {copyStatus === 'copied' ? 'Copiado' : 'Copiar'}
            </button>
            <button className="primary-button" type="button" onClick={onClose}>
              Concluir
            </button>
          </div>
        </footer>
      </div>
    </Dialog>
  );
}

/** Gives a person of the staff a credential: e-mail and a first password. */
export function GrantAccessDialog({
  candidates,
  onStored,
  onClose,
}: GrantAccessDialogProps): React.JSX.Element {
  const [personId, setPersonId] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(temporaryPassword);
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [granted, setGranted] = useState<GrantedCredential | null>(null);

  const errors = wasSubmitted ? validate(personId, email, password) : {};
  const selected = candidates.find(({ id }) => id === personId) ?? null;

  async function grant(submitEvent: SyntheticEvent<HTMLFormElement>): Promise<void> {
    submitEvent.preventDefault();
    setWasSubmitted(true);
    setFailure(null);
    if (Object.keys(validate(personId, email, password)).length > 0 || selected === null) return;

    setIsSaving(true);
    try {
      const account = await authService.createAccount({
        personId: selected.id,
        email: email.trim(),
        password,
      });
      onStored();
      setGranted({ name: selected.name, email: account.email, password });
    } catch (error: unknown) {
      setFailure(error instanceof ApiRequestError ? error.message : SAVE_ERROR_MESSAGE);
      setIsSaving(false);
    }
  }

  if (granted) return <CredentialCard credential={granted} onClose={onClose} />;

  return (
    <Dialog
      title="Dar acesso ao sistema"
      className="dialog__panel--form"
      onClose={() => {
        if (!isSaving) onClose();
      }}
    >
      <form
        className="event-form"
        noValidate
        onSubmit={(submitEvent) => {
          void grant(submitEvent);
        }}
      >
        <FormField
          id="access-person"
          label="Pessoa"
          isRequired
          error={errors.person}
          hint={
            selected
              ? accessDescription(selected)
              : candidates.length === 0
                ? 'Toda a equipe cadastrada já tem acesso.'
                : 'Só a equipe acessa. Acolhidos não entram no sistema.'
          }
        >
          <FormSelect
            id="access-person"
            showsPrompt={personId === null}
            value={personId ?? NOBODY}
            disabled={isSaving}
            {...fieldErrorProps('access-person', errors.person)}
            onChange={(changeEvent) => {
              const value = changeEvent.target.value;
              setPersonId(value === NOBODY ? null : Number(value));
            }}
          >
            <option value={NOBODY}>Escolha da equipe</option>
            {candidates.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name} · {person.role.description}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField id="access-email" label="E-mail" isRequired error={errors.email}>
          <input
            id="access-email"
            type="email"
            autoComplete="off"
            placeholder="nome@exemplo.com"
            value={email}
            disabled={isSaving}
            {...fieldErrorProps('access-email', errors.email)}
            onChange={(inputEvent) => {
              setEmail(inputEvent.target.value);
            }}
          />
        </FormField>
        <FormField
          id="access-password"
          label="Senha provisória"
          isRequired
          error={errors.password}
          hint="Você entrega a senha à pessoa: ela ainda não consegue trocá-la sozinha."
        >
          <div className="password-actions">
            <input
              id="access-password"
              type="text"
              autoComplete="new-password"
              spellCheck={false}
              value={password}
              disabled={isSaving}
              {...fieldErrorProps('access-password', errors.password)}
              onChange={(inputEvent) => {
                setPassword(inputEvent.target.value);
              }}
            />
            <button
              className="outline-button"
              type="button"
              disabled={isSaving}
              onClick={() => {
                setPassword(temporaryPassword());
              }}
            >
              Gerar
            </button>
          </div>
        </FormField>
        <footer className="dialog__footer">
          {failure === null ? null : <AlertMessage>{failure}</AlertMessage>}
          <div className="dialog__actions">
            <button className="outline-button" type="button" disabled={isSaving} onClick={onClose}>
              Cancelar
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={isSaving}
              aria-busy={isSaving}
            >
              {isSaving ? <span className="spinner" aria-hidden="true" /> : null}
              {isSaving ? 'Salvando...' : 'Dar acesso'}
            </button>
          </div>
        </footer>
      </form>
    </Dialog>
  );
}
