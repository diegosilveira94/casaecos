import { Box, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { useMemo, useRef, useState } from 'react';

import type { PersonResponse } from '@casaecos/shared-types';

import { ChoiceCard } from '../../../shared/ui/ChoiceCard.js';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog.js';
import { Dialog } from '../../../shared/ui/Dialog.js';
import { LoadError } from '../../../shared/ui/LoadError.js';
import { FieldGroup } from '../../../shared/ui/FieldGroup.js';
import { FormSelect } from '../../../shared/ui/FormSelect.js';
import { ROLE_IDS } from '../../shared/person/domain/roles.js';
import { AgendaMessage, type AgendaAudience } from '../domain/agenda-message.js';
import { SEND_PERIOD_LABELS, sendPeriodFor, type SendPeriodKey } from '../domain/send-period.js';
import { splitWhatsAppBold, toWhatsAppNumber, whatsAppLink } from '../domain/whatsapp-link.js';
import { useSendAgendaData } from '../hooks/use-send-agenda-data.js';

const MESSAGE_BUBBLE_SX = {
  m: 0,
  maxHeight: { xs: '19rem', md: '24rem' },
  overflowY: 'auto',
  px: 2,
  py: 1.75,
  borderRadius: '0.2rem 0.9rem 0.9rem',
  fontFamily: 'inherit',
  fontSize: '0.9rem',
  lineHeight: 1.45,
  overflowWrap: 'anywhere',
  whiteSpace: 'pre-wrap',
};

type AudienceKind = AgendaAudience['kind'];

const AUDIENCE_OPTIONS: { kind: AudienceKind; label: string; hint: string }[] = [
  {
    kind: 'general',
    label: 'Geral',
    hint: 'Compromissos de todas as casas. Escolha o grupo no WhatsApp.',
  },
  {
    kind: 'drivers',
    label: 'Motoristas',
    hint: 'Compromissos com motorista, de todas as casas. Escolha o grupo no WhatsApp.',
  },
  {
    kind: 'person',
    label: 'Uma pessoa',
    hint: 'Compromissos em que a pessoa participa. Abre direto a conversa com ela.',
  },
];

const PERIOD_KEYS = Object.keys(SEND_PERIOD_LABELS) as SendPeriodKey[];

function personOptionLabel(person: PersonResponse): string {
  if (toWhatsAppNumber(person.phone) !== null) return `${person.name} · ${person.role.description}`;
  return `${person.name} · ${person.phone === null ? 'sem telefone' : 'telefone inválido'}`;
}

interface SendAgendaDialogProps {
  today: Date;
  onClose: () => void;
}

/**
 * Writes the agenda as a WhatsApp message for the person to review and send: the system
 * never sends anything, so it cannot tell whether the message went out.
 */
export function SendAgendaDialog({ today, onClose }: SendAgendaDialogProps): React.JSX.Element {
  const [audienceKind, setAudienceKind] = useState<AudienceKind>('general');
  const [periodKey, setPeriodKey] = useState<SendPeriodKey>('tomorrow');
  const [personId, setPersonId] = useState<number | null>(null);
  // Null follows the template. While edited, what would change the template is locked.
  const [customText, setCustomText] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<'close' | 'restore' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [now] = useState(() => new Date());
  const editor = useRef<HTMLTextAreaElement>(null);
  const preview = useRef<HTMLPreElement>(null);

  const period = useMemo(() => sendPeriodFor(periodKey, today), [periodKey, today]);
  const { people, events, reload } = useSendAgendaData(period);

  const everyone = people.status === 'loaded' ? people.people : [];
  const recipients = everyone.filter(({ role }) => role.id !== ROLE_IDS.sheltered);
  const person = everyone.find(({ id }) => id === personId) ?? null;

  const audience: AgendaAudience | null =
    audienceKind !== 'person'
      ? { kind: audienceKind }
      : person && { kind: 'person', person: { id: person.id, name: person.name } };

  const template =
    audience && people.status === 'loaded' && events.status === 'loaded'
      ? new AgendaMessage(audience, everyone).build(events.events, period, now)
      : null;

  const isEditing = customText !== null;
  const text = customText ?? template;
  const hasText = text !== null && text.trim() !== '';
  const hasUnsavedEdit = isEditing && customText !== template;
  const whatsAppNumber = audienceKind === 'person' ? toWhatsAppNumber(person?.phone ?? null) : null;
  const audienceHint = AUDIENCE_OPTIONS.find(({ kind }) => kind === audienceKind)?.hint;
  const failureMessage =
    people.status === 'failed'
      ? people.message
      : events.status === 'failed'
        ? events.message
        : null;

  const requestClose = (): void => {
    if (hasUnsavedEdit) setConfirmation('close');
    else onClose();
  };

  const restoreTemplate = (): void => {
    setCustomText(null);
    setConfirmation(null);
    setFeedback('A mensagem voltou ao modelo.');
  };

  const startEditing = (): void => {
    setCustomText(template);
    setFeedback('');
    // The textarea only exists after this render.
    requestAnimationFrame(() => {
      const textEnd = editor.current?.value.length ?? 0;
      editor.current?.focus();
      editor.current?.setSelectionRange(textEnd, textEnd);
    });
  };

  const selectMessageText = (): void => {
    if (editor.current) {
      editor.current.select();
      return;
    }
    const selection = window.getSelection();
    if (preview.current && selection) selection.selectAllChildren(preview.current);
  };

  const copyMessage = async (): Promise<void> => {
    if (text === null) return;
    try {
      await navigator.clipboard.writeText(text);
      setFeedback('Mensagem copiada. Cole no grupo ou na conversa do WhatsApp.');
    } catch {
      selectMessageText();
      setFeedback('Não foi possível copiar sozinho. O texto ficou selecionado para você copiar.');
    }
  };

  const emptyMessage = (): string => {
    if (audienceKind === 'person' && person === null) {
      return 'Selecione a pessoa para ver a mensagem.';
    }
    if (people.status === 'loading' || events.status === 'loading') {
      return 'Carregando compromissos…';
    }
    const periodName = SEND_PERIOD_LABELS[periodKey].toLowerCase();
    return audienceKind === 'person' && person
      ? `${person.name} não tem compromissos em: ${periodName}.`
      : `Não há compromissos em: ${periodName}.`;
  };

  return (
    <>
      <Dialog
        title="Enviar agenda pelo WhatsApp"
        size="large"
        onClose={requestClose}
        actions={
          <>
            <Button
              variant="outlined"
              disabled={!hasText}
              onClick={() => {
                void copyMessage();
              }}
            >
              Copiar mensagem
            </Button>
            {hasText ? (
              <Button
                variant="contained"
                href={whatsAppLink(text, whatsAppNumber)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setFeedback('A mensagem só é enviada quando você confirmar no WhatsApp.');
                }}
              >
                Abrir no WhatsApp
              </Button>
            ) : (
              <Button variant="contained" disabled>
                Abrir no WhatsApp
              </Button>
            )}
          </>
        }
      >
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Confira a mensagem. Envie no WhatsApp.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gap: { xs: 2.5, md: 3.5 },
            alignContent: 'start',
            gridTemplateColumns: { md: 'minmax(0, 20rem) minmax(0, 1fr)' },
            minWidth: 0,
          }}
        >
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <FieldGroup legend="Para quem" hint={audienceHint}>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                {AUDIENCE_OPTIONS.map(({ kind, label }) => (
                  <ChoiceCard
                    key={kind}
                    kind="radio"
                    name="send-audience"
                    label={label}
                    isChecked={audienceKind === kind}
                    isDisabled={isEditing}
                    onChange={() => {
                      setFeedback('');
                      setAudienceKind(kind);
                    }}
                  />
                ))}
              </Stack>
            </FieldGroup>

            {audienceKind === 'person' ? (
              <FormSelect
                label="Pessoa"
                value={personId ?? ''}
                disabled={isEditing || people.status !== 'loaded'}
                onChange={(changeEvent) => {
                  setFeedback('');
                  setPersonId(Number(changeEvent.target.value));
                }}
              >
                <option value="" disabled>
                  Selecione a pessoa
                </option>
                {recipients.map((recipient) => (
                  <option
                    key={recipient.id}
                    value={recipient.id}
                    disabled={toWhatsAppNumber(recipient.phone) === null}
                  >
                    {personOptionLabel(recipient)}
                  </option>
                ))}
              </FormSelect>
            ) : null}

            <FieldGroup legend="Período">
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                {PERIOD_KEYS.map((key) => (
                  <ChoiceCard
                    key={key}
                    kind="radio"
                    name="send-period"
                    label={SEND_PERIOD_LABELS[key]}
                    isChecked={periodKey === key}
                    isDisabled={isEditing}
                    onChange={() => {
                      setFeedback('');
                      setPeriodKey(key);
                    }}
                  />
                ))}
              </Stack>
            </FieldGroup>
          </Stack>

          <Stack spacing={1} sx={{ minWidth: 0 }}>
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}
            >
              <Typography
                id="send-message-label"
                component="span"
                variant="body2"
                sx={{ fontWeight: 600 }}
              >
                Mensagem
              </Typography>
              {hasText ? (
                <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>
                  {text.length} caracteres
                </Typography>
              ) : null}
            </Stack>

            {failureMessage !== null ? (
              <LoadError message={failureMessage} onRetry={reload} />
            ) : isEditing ? (
              <TextField
                multiline
                rows={12}
                inputRef={editor}
                helperText="Para deixar em negrito, use *texto*. Para trocar quem recebe ou o período, volte ao modelo."
                value={customText}
                slotProps={{ htmlInput: { 'aria-labelledby': 'send-message-label' } }}
                onChange={(changeEvent) => {
                  setFeedback('');
                  setCustomText(changeEvent.target.value);
                }}
              />
            ) : template !== null ? (
              <Box
                component="pre"
                ref={preview}
                sx={{ ...MESSAGE_BUBBLE_SX, bgcolor: 'primary.light' }}
              >
                {splitWhatsAppBold(template).map(({ text: segment, isBold }, index) =>
                  isBold ? <strong key={index}>{segment}</strong> : segment,
                )}
              </Box>
            ) : (
              <Box
                sx={{
                  ...MESSAGE_BUBBLE_SX,
                  bgcolor: 'background.default',
                  color: 'text.secondary',
                }}
              >
                {emptyMessage()}
              </Box>
            )}

            {template !== null && failureMessage === null ? (
              <Link
                sx={{ alignSelf: 'flex-start', minHeight: '2.75rem', fontWeight: 600 }}
                component="button"
                type="button"
                onClick={() => {
                  if (!isEditing) startEditing();
                  else if (hasUnsavedEdit) setConfirmation('restore');
                  else restoreTemplate();
                }}
              >
                {isEditing ? 'Voltar ao modelo' : 'Personalizar mensagem'}
              </Link>
            ) : null}
          </Stack>
        </Box>

        <Typography
          role="status"
          variant="body2"
          color="primary"
          sx={{ mt: 1, minHeight: '1.3rem' }}
        >
          {feedback}
        </Typography>
      </Dialog>

      {confirmation === null ? null : (
        <ConfirmDialog
          title="Descartar alterações?"
          destructiveLabel="Descartar"
          keepLabel="Continuar editando"
          onConfirm={confirmation === 'close' ? onClose : restoreTemplate}
          onKeep={() => {
            setConfirmation(null);
          }}
        >
          Você personalizou a mensagem. Se continuar, o texto editado será perdido.
        </ConfirmDialog>
      )}
    </>
  );
}
