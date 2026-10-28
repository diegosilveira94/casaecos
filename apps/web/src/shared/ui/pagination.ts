/** Page sizes offered under a list. The first one is where every list starts. */
export const PAGE_SIZES = [10, 20, 50] as const;

export type PageSize = (typeof PAGE_SIZES)[number];

export interface PageWindow<T> {
  items: T[];
  /** The page actually shown: a list that shrank keeps the user on its last page. */
  page: number;
  pageCount: number;
  /** 1-based positions of the first and last item shown; both 0 for an empty list. */
  firstPosition: number;
  lastPosition: number;
  total: number;
}

/** Cuts one page out of a list already in memory. */
export function paginate<T>(items: readonly T[], page: number, pageSize: number): PageWindow<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const shownPage = Math.min(Math.max(1, page), pageCount);
  const start = (shownPage - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return {
    items: pageItems,
    page: shownPage,
    pageCount,
    firstPosition: pageItems.length === 0 ? 0 : start + 1,
    lastPosition: start + pageItems.length,
    total: items.length,
  };
}
