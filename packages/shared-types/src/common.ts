/**
 * API response contract.
 *
 * Success returns the raw payload: the resource itself, or `Paginated<T>` for
 * listings. No `{ data }` envelope — the HTTP status already separates success from
 * error, and the client consumes it without unwrapping.
 *
 * Any 4xx/5xx returns an `ApiError`, whose `message` is written in Portuguese
 * because it reaches the end user.
 */
export interface ApiError {
  message: string;
  details?: unknown;
}

export interface ApiMessage {
  message: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

// Single place to change if the schema stops using uuid.
export type Id = string;
