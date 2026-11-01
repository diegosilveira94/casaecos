import { useCallback, useEffect, useState } from 'react';

import { ApiRequestError } from './api-request-error.js';

export type ApiResource<T> =
  { status: 'loading' } | { status: 'loaded'; data: T } | { status: 'failed'; message: string };

const LOAD_ERROR_MESSAGE = 'Não foi possível carregar os dados. Tente novamente.';

interface ApiResourceResult<T> {
  resource: ApiResource<T>;
  /** Loads again, such as after a save or on "Tentar novamente". */
  reload: () => void;
}

interface TaggedOutcome<T> {
  key: string;
  requestKey: string;
  outcome: ApiResource<T>;
}

/**
 * Reads something from the API for a screen. `key` names what is being read: a new
 * key reads as `loading` at once and an answer for an old key is dropped, so `load`
 * itself may change on every render. A reload keeps the loaded data on screen until
 * the new answer arrives, so a list does not blink after each save.
 */
export function useApiResource<T>(key: string, load: () => Promise<T>): ApiResourceResult<T> {
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<TaggedOutcome<T> | null>(null);
  const requestKey = `${key}#${String(reloadCount)}`;

  useEffect(() => {
    let current = true;
    load().then(
      (data) => {
        if (current) setResult({ key, requestKey, outcome: { status: 'loaded', data } });
      },
      (error: unknown) => {
        const message = error instanceof ApiRequestError ? error.message : LOAD_ERROR_MESSAGE;
        if (current) setResult({ key, requestKey, outcome: { status: 'failed', message } });
      },
    );
    return () => {
      current = false;
    };
    // `load` is read through the key on purpose: it is usually an inline closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const reload = useCallback(() => {
    setReloadCount((count) => count + 1);
  }, []);

  const isCurrent = result?.requestKey === requestKey;
  const isStaleOfSameKey = result?.key === key && result.outcome.status === 'loaded';

  return {
    resource: result && (isCurrent || isStaleOfSameKey) ? result.outcome : { status: 'loading' },
    reload,
  };
}
