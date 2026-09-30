import { z } from 'zod';

const DEFAULT_PAGE_SIZE = 50;
// Big enough for a month of the agenda in one call, small enough to bound the response.
const MAX_PAGE_SIZE = 200;

export interface PageRequest {
  page: number;
  pageSize: number;
}

/** Query fields of a paginated listing; spread into the route's query schema. */
export const paginationQueryShape = {
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
};

export function pageOffset({ page, pageSize }: PageRequest): number {
  return (page - 1) * pageSize;
}
