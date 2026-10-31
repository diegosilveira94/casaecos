import { useMemo, useRef, useState } from 'react';

import type { PersonResponse } from '@casaecos/shared-types';

import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog.js';
import { Dialog } from '../../../shared/ui/Dialog.js';
import { FormField } from '../../../shared/ui/FormField.js';
import { FormSelect } from '../../../shared/ui/FormSelect.js';
import { AgendaMessage, type AgendaAudience } from '../domain/agenda-message.js';
import { SHELTERED_ROLE_ID } from '../domain/event-form.js';
import { SEND_PERIOD_LABELS, sendPeriodFor, type SendPeriodKey } from '../domain/send-period.js';
import { splitWhatsAppBold, toWhatsAppNumber, whatsAppLink } from '../domain/whatsapp-link.js';
import { useSendAgendaData } from '../hooks/use-send-agenda-data.js';
import { MonthLoadError } from './MonthLoadError.js';

type AudienceKind = AgendaAudience['kind'];

const AUDIENCE_OPTIONS: { kind: AudienceKind; label: string; hint: string }[] = [
  {
    kind: 'general',
    label: 'Geral',
    hint: 'Compromissos de todas as casas. Você escolhe o grupo no WhatsApp.',
  },
  {
    kind: 'drivers',
    label: 'Motoristas',
    hint: 'Compromissos com motorista, de todas as casas. Você escolhe o grupo no WhatsApp.',
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

function ignoreClose(): void {
  // The confirmation on top answers Escape first.
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
  const recipients = everyone.filter(({ role }) => role.id !== SHELTERED_ROLE_ID);
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
        className="dialog__panel--form dialog__panel--send-agenda"
        onClose={confirmation === null ? requestClose : ignoreClose}
      >
        <p className="send-agenda__intro">
          Confira a mensagem. O envio é feito por você, no WhatsApp.
        </p>

        <div className="send-agenda">
          <div className="send-agenda__controls">
            <fieldset className="send-agenda__group" disabled={isEditing}>
              <legend>Para quem</legend>
              <div className="send-agenda__choices">
                {AUDIENCE_OPTIONS.map(({ kind, label }) => (
                  <label className="send-agenda__choice" key={kind}>
                    <input
                      type="radio"
                      name="send-audience"
                      checked={audienceKind === kind}
                      onChange={() => {
                        setFeedback('');
                        setAudienceKind(kind);
                      }}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <p className="form-field__hint">{audienceHint}</p>
            </fieldset>

            {audienceKind === 'person' ? (
              <FormField id="send-person" label="Pessoa">
                <FormSelect
                  id="send-person"
                  value={personId ?? ''}
                  showsPrompt={personId === null}
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
              </FormField>
            ) : null}

            <fieldset className="send-agenda__group" disabled={isEditing}>
              <legend>Período</legend>
              <div className="send-agenda__choices">
                {PERIOD_KEYS.map((key) => (
                  <label className="send-agenda__choice" key={key}>
                    <input
                      type="radio"
                      name="send-period"
                      checked={periodKey === key}
                      onChange={() => {
                        setFeedback('');
                        setPeriodKey(key);
                      }}
                    />
                    <span>{SEND_PERIOD_LABELS[key]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="send-agenda__preview">
            <div className="send-agenda__preview-heading">
              <span id="send-message-label">Mensagem</span>
              {hasText ? (
                <span className="send-agenda__count">{text.length} caracteres</span>
              ) : null}
            </div>

            {failureMessage !== null ? (
              <MonthLoadError message={failureMessage} onRetry={reload} />
            ) : isEditing ? (
              <textarea
                ref={editor}
                className="send-agenda__editor"
                aria-labelledby="send-message-label"
                value={customText}
                onChange={(changeEvent) => {
                  setFeedback('');
                  setCustomText(changeEvent.target.value);
                }}
              />
            ) : template !== null ? (
              <pre ref={preview} className="send-agenda__bubble">
                {splitWhatsAppBold(template).map(({ text: segment, isBold }, index) =>
                  isBold ? <strong key={index}>{segment}</strong> : segment,
                )}
              </pre>
            ) : (
              <p className="send-agenda__bubble send-agenda__bubble--empty">{emptyMessage()}</p>
            )}

            {isEditing ? (
              <p className="form-field__hint">
                Para deixar em negrito, use *texto*. Para trocar quem recebe ou o período, volte ao
                modelo.
              </p>
            ) : null}
            {template !== null && failureMessage === null ? (
              <button
                className="send-agenda__toggle"
                type="button"
                onClick={() => {
                  if (!isEditing) startEditing();
                  else if (hasUnsavedEdit) setConfirmation('restore');
                  else restoreTemplate();
                }}
              >
                {isEditing ? 'Voltar ao modelo' : 'Personalizar mensagem'}
              </button>
            ) : null}
          </div>
        </div>

        <p className="send-agenda__feedback" role="status">
          {feedback}
        </p>

        <div className="dialog__actions">
          <button
            className="outline-button"
            type="button"
            disabled={!hasText}
            onClick={() => {
              void copyMessage();
            }}
          >
            Copiar mensagem
          </button>
          {hasText ? (
            <a
              className="primary-button"
              href={whatsAppLink(text, whatsAppNumber)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                setFeedback('A mensagem só é enviada quando você confirmar no WhatsApp.');
              }}
            >
              Abrir no WhatsApp
            </a>
          ) : (
            <button className="primary-button" type="button" disabled>
              Abrir no WhatsApp
            </button>
          )}
        </div>
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
