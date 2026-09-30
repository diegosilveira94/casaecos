import { z } from 'zod';

/** Optional text that the client clears by sending `null`; blank strings become null in the service. */
export const nullableText = (maximumLength: number) =>
  z.union([z.string().trim().max(maximumLength), z.null()]);
