import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionStore } from './session-store.js';

const EIGHT_HOURS_IN_SECONDS = 8 * 60 * 60;

describe('SessionStore', () => {
  const store = new SessionStore(window.localStorage);

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-09-29T08:00:00-03:00') });
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it('devolve o token salvo enquanto ele vale', () => {
    store.save({ token: 'token-valido', expiresInSeconds: EIGHT_HOURS_IN_SECONDS });

    vi.advanceTimersByTime((EIGHT_HOURS_IN_SECONDS - 1) * 1000);

    expect(store.readAccessToken()).toBe('token-valido');
  });

  it('descarta o token vencido em vez de mandá-lo para a API', () => {
    store.save({ token: 'token-valido', expiresInSeconds: EIGHT_HOURS_IN_SECONDS });

    vi.advanceTimersByTime(EIGHT_HOURS_IN_SECONDS * 1000);

    expect(store.readAccessToken()).toBeNull();
    expect(window.localStorage.length).toBe(0);
  });

  it('ignora conteúdo que não é uma sessão', () => {
    window.localStorage.setItem('casaecos.session', 'não é json');
    expect(store.readAccessToken()).toBeNull();

    window.localStorage.setItem('casaecos.session', JSON.stringify({ token: 'sem-validade' }));
    expect(store.readAccessToken()).toBeNull();
  });

  it('esquece a sessão no clear', () => {
    store.save({ token: 'token-valido', expiresInSeconds: EIGHT_HOURS_IN_SECONDS });

    store.clear();

    expect(store.readAccessToken()).toBeNull();
  });
});
