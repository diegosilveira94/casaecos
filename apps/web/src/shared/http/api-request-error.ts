import type { ApiError } from '@casaecos/shared-types';

/**
 * Any call to the API that did not succeed. `message` is already the Portuguese
 * text for the screen; `details` carries the validation issues of a 400.
 */
export class ApiRequestError extends Error {
  /** `null` when the request never reached the API (offline, server down). */
  readonly status: number | null;
  readonly details: unknown;

  constructor(status: number | null, apiError: ApiError) {
    super(apiError.message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.details = apiError.details;
  }
}
