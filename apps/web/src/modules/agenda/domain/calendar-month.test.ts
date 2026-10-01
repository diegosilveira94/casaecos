import { describe, expect, it } from 'vitest';

import { dayKey, toOffsetIsoString } from './calendar-dates.js';
import { CalendarMonth } from './calendar-month.js';

const september2026 = CalendarMonth.containing(new Date(2026, 8, 30, 15, 0));

describe('CalendarMonth', () => {
  it('nomeia o mês com inicial maiúscula', () => {
    expect(september2026.label).toBe('Setembro 2026');
  });

  it('vira o ano ao avançar e ao voltar', () => {
    const december = CalendarMonth.containing(new Date(2026, 11, 5));

    expect(december.next().label).toBe('Janeiro 2027');
    expect(december.next().previous().label).toBe('Dezembro 2026');
  });

  it('monta semanas de domingo a sábado cobrindo o mês inteiro', () => {
    const weeks = september2026.weeks();

    expect(weeks).toHaveLength(5);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(dayKey(weeks[0]![0]!)).toBe('2026-08-30');
    expect(dayKey(weeks[4]![6]!)).toBe('2026-10-03');
  });

  it('usa seis semanas quando o mês pede', () => {
    // August 2026 starts on a Saturday and has 31 days.
    expect(CalendarMonth.containing(new Date(2026, 7, 1)).weeks()).toHaveLength(6);
  });

  it('não inclui semana inteira do mês seguinte', () => {
    // February 2026 starts on a Sunday and ends on a Saturday: exactly four weeks.
    const weeks = CalendarMonth.containing(new Date(2026, 1, 1)).weeks();

    expect(weeks).toHaveLength(4);
    expect(dayKey(weeks[3]![6]!)).toBe('2026-02-28');
  });

  it('devolve o período semiaberto do mês com o fuso do aparelho', () => {
    expect(september2026.period()).toEqual({
      from: toOffsetIsoString(new Date(2026, 8, 1)),
      to: toOffsetIsoString(new Date(2026, 9, 1)),
    });
  });

  it('sabe se um dia é do mês', () => {
    expect(september2026.contains(new Date(2026, 8, 1))).toBe(true);
    expect(september2026.contains(new Date(2026, 9, 1))).toBe(false);
  });
});

describe('toOffsetIsoString', () => {
  it('escreve a hora local com o offset, que a API exige', () => {
    const date = new Date(2026, 8, 30, 9, 5, 7);
    const text = toOffsetIsoString(date);

    expect(text).toMatch(/^2026-09-30T09:05:07[+-]\d{2}:\d{2}$/);
    expect(new Date(text).getTime()).toBe(date.getTime());
  });
});
