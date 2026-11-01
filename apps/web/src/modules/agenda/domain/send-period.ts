import { addDays, toOffsetIsoString } from './calendar-dates.js';

export type SendPeriodKey = 'today' | 'tomorrow' | 'nextSevenDays';

export const SEND_PERIOD_LABELS: Record<SendPeriodKey, string> = {
  today: 'Hoje',
  tomorrow: 'Amanhã',
  nextSevenDays: 'Próximos 7 dias',
};

/** The days a message covers, both included, and the same period as the API filter. */
export interface SendPeriod {
  firstDay: Date;
  lastDay: Date;
  from: string;
  to: string;
}

const DAY_OFFSETS: Record<SendPeriodKey, { first: number; last: number }> = {
  today: { first: 0, last: 0 },
  tomorrow: { first: 1, last: 1 },
  nextSevenDays: { first: 0, last: 6 },
};

export function sendPeriodFor(key: SendPeriodKey, today: Date): SendPeriod {
  const { first, last } = DAY_OFFSETS[key];
  return {
    firstDay: addDays(today, first),
    lastDay: addDays(today, last),
    from: toOffsetIsoString(addDays(today, first)),
    to: toOffsetIsoString(addDays(today, last + 1)),
  };
}
