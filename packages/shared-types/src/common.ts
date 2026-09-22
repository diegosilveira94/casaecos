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

// Ponto único de troca se o schema deixar de usar uuid.
export type Id = string;
