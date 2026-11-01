import { Alert, Box, Button, FormHelperText, Stack, TextField, Typography } from '@mui/material';
import { useState, type SyntheticEvent } from 'react';

import type { PersonResponse } from '@casaecos/shared-types';

import { ApiRequestError } from '../../../../shared/http/api-request-error.js';
import { AlertMessage } from '../../../../shared/ui/AlertMessage.js';
import { Dialog } from '../../../../shared/ui/Dialog.js';
import { FormSelect } from '../../../../shared/ui/FormSelect.js';
import { roleGuide } from '../../person/domain/roles.js';
import { temporaryPassword } from '../domain/temporary-password.js';
import { authService } from '../services/auth-service.js';

const MONOSPACE = 'ui-monospace, Consolas, monospace';

function Credential({ term, value }: { term: string; value: string }): React.JSX.Element {
  return (
    <div>
      <Typography component="dt" variant="caption" sx={{ color: 'text.secondary' }}>
        {term}
      </Typography>
      <Typography component="dd" sx={{ fontFamily: MONOSPACE, wordBreak: 'break-all' }}>
        {value}
      </Typography>
    </div>
  );
}

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
    <Dialog
      title="Acesso criado"
      onClose={onClose}
      actions={
        <>
          <Button
            variant="outlined"
            onClick={() => {
              void copy();
            }}
          >
            {copyStatus === 'copied' ? 'Copiado' : 'Copiar'}
          </Button>
          <Button variant="contained" onClick={onClose}>
            Concluir
          </Button>
        </>
      }
    >
      <Stack spacing={2.5}>
        <Alert severity="success">
          {credential.name} já pode entrar no Casa Ecos. Passe estes dados por um canal seguro: a
          senha não aparece de novo.
        </Alert>
        <Box
          component="dl"
          sx={{
            display: 'grid',
            gap: 1,
            p: 2,
            bgcolor: 'background.default',
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
          }}
        >
          <Credential term="E-mail" value={credential.email} />
          <Credential term="Senha provisória" value={credential.password} />
        </Box>
        {copyStatus === 'failed' ? (
          <FormHelperText role="status">
            Não deu para copiar: selecione o texto acima.
          </FormHelperText>
        ) : null}
      </Stack>
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
      onClose={() => {
        if (!isSaving) onClose();
      }}
      onSubmit={(submitEvent) => {
        void grant(submitEvent);
      }}
      actions={
        <>
          {failure === null ? null : <AlertMessage>{failure}</AlertMessage>}
          <Button color="inherit" disabled={isSaving} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" loading={isSaving} loadingPosition="start">
            {isSaving ? 'Salvando...' : 'Dar acesso'}
          </Button>
        </>
      }
    >
      <Stack spacing={2.5}>
        <FormSelect
          label="Pessoa"
          required
          error={errors.person !== undefined}
          helperText={
            errors.person ??
            (selected
              ? accessDescription(selected)
              : candidates.length === 0
                ? 'Toda a equipe cadastrada já tem acesso.'
                : 'Só a equipe acessa. Acolhidos não entram no sistema.')
          }
          value={personId ?? NOBODY}
          disabled={isSaving}
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
        <TextField
          label="E-mail"
          type="email"
          required
          autoComplete="off"
          placeholder="nome@exemplo.com"
          error={errors.email !== undefined}
          helperText={errors.email}
          value={email}
          disabled={isSaving}
          onChange={(inputEvent) => {
            setEmail(inputEvent.target.value);
          }}
        />
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <TextField
            label="Senha provisória"
            required
            autoComplete="new-password"
            error={errors.password !== undefined}
            helperText={
              errors.password ??
              'Você entrega a senha à pessoa: ela ainda não consegue trocá-la sozinha.'
            }
            value={password}
            disabled={isSaving}
            slotProps={{ htmlInput: { spellCheck: false, style: { fontFamily: MONOSPACE } } }}
            onChange={(inputEvent) => {
              setPassword(inputEvent.target.value);
            }}
          />
          <Button
            sx={{ minHeight: '3.5rem' }}
            variant="outlined"
            disabled={isSaving}
            onClick={() => {
              setPassword(temporaryPassword());
            }}
          >
            Gerar
          </Button>
        </Stack>
      </Stack>
    </Dialog>
  );
}
