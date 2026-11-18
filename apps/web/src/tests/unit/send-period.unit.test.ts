import { describe, expect, it } from 'vitest';

import { toOffsetIsoString } from '../../modules/agenda/domain/calendar-dates.js';
import { sendPeriodFor } from '../../modules/agenda/domain/send-period.js';

describe('sendPeriodFor (unitario)', () => {
  const today = new Date(2026, 10, 18);

  it('cria o periodo de hoje com apenas um dia', () => {
    const period = sendPeriodFor('today', today);

    expect(period.firstDay).toEqual(new Date(2026, 10, 18));
    expect(period.lastDay).toEqual(new Date(2026, 10, 18));
    expect(period.from).toBe(toOffsetIsoString(new Date(2026, 10, 18)));
    expect(period.to).toBe(toOffsetIsoString(new Date(2026, 10, 19)));
  });

  it('cria o periodo de amanha', () => {
    const period = sendPeriodFor('tomorrow', today);

    expect(period.firstDay).toEqual(new Date(2026, 10, 19));
    expect(period.lastDay).toEqual(new Date(2026, 10, 19));
  });

  it('inclui hoje e os seis dias seguintes nos proximos sete dias', () => {
    const period = sendPeriodFor('nextSevenDays', today);

    expect(period.firstDay).toEqual(new Date(2026, 10, 18));
    expect(period.lastDay).toEqual(new Date(2026, 10, 24));
    expect(period.to).toBe(toOffsetIsoString(new Date(2026, 10, 25)));
  });

  it('avanca corretamente na mudanca de mes', () => {
    const period = sendPeriodFor('tomorrow', new Date(2026, 10, 30));

    expect(period.firstDay).toEqual(new Date(2026, 11, 1));
    expect(period.to).toBe(toOffsetIsoString(new Date(2026, 11, 2)));
  });

  it('nao altera a data recebida', () => {
    const originalTime = today.getTime();

    sendPeriodFor('nextSevenDays', today);

    expect(today.getTime()).toBe(originalTime);
  });
});
