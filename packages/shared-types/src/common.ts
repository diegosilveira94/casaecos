/**
 * Contrato de resposta da API.
 *
 * Sucesso devolve o payload cru: o recurso direto no corpo, ou `Paginated<T>`
 * em listagens. Sem envelope `{ data }` — o status HTTP já separa sucesso de
 * erro, e o cliente consome sem desembrulhar.
 *
 * Erro (qualquer 4xx/5xx) devolve sempre `ApiError`.
 */
export interface ApiError {
  message: string;
  details?: unknown;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

// Ponto único de troca se o schema deixar de usar uuid.
export type Id = string;
