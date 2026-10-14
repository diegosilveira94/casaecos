import { describe, expect, it } from 'vitest';

import { dayKey, toOffsetIsoString } from './calendar-dates.js';
import { daysOfWeek, moveVisibleDate, periodFor, startOfWeek } from './calendar-period.js';

const wednesday = new Date(2026, 8, 30, 15, 30);

describe('períodos das visões da agenda', () => {
  it('monta a semana de domingo a sábado, como a grade mensal', () => {
    expect(dayKey(startOfWeek(wednesday))).toBe('2026-09-27');
    expect(daysOfWeek(wednesday).map(dayKey)).toEqual([
      '2026-09-27',
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
    ]);
  });

  it('devolve períodos semiabertos de semana e dia no fuso do aparelho', () => {
    expect(periodFor('week', wednesday)).toEqual({
      from: toOffsetIsoString(new Date(2026, 8, 27)),
      to: toOffsetIsoString(new Date(2026, 9, 4)),
    });
    expect(periodFor('day', wednesday)).toEqual({
      from: toOffsetIsoString(new Date(2026, 8, 30)),
      to: toOffsetIsoString(new Date(2026, 9, 1)),
    });
  });

  it('navega pelo tamanho da visão e vira mês e ano corretamente', () => {
    expect(dayKey(moveVisibleDate('day', new Date(2026, 11, 31), 1))).toBe('2027-01-01');
    expect(dayKey(moveVisibleDate('week', wednesday, -1))).toBe('2026-09-23');
    expect(dayKey(moveVisibleDate('month', new Date(2026, 11, 31), 1))).toBe('2027-01-01');
  });
});
