import { TablePagination } from '@mui/material';

import { PAGE_SIZES, type PageSize, type PageWindow } from './pagination.js';

interface PagerProps {
  window: PageWindow<unknown>;
  pageSize: PageSize;
  onChangePage: (page: number) => void;
  onChangePageSize: (pageSize: PageSize) => void;
}

function isPageSize(value: number): value is PageSize {
  return (PAGE_SIZES as readonly number[]).includes(value);
}

/** Under a list: what is shown, how many per page and previous/next. */
export function Pager({
  window,
  pageSize,
  onChangePage,
  onChangePageSize,
}: PagerProps): React.JSX.Element {
  return (
    <TablePagination
      component="nav"
      aria-label="Paginação"
      count={window.total}
      // MUI counts pages from zero; PageWindow, from one.
      page={window.page - 1}
      rowsPerPage={pageSize}
      rowsPerPageOptions={[...PAGE_SIZES]}
      labelRowsPerPage="Por página"
      labelDisplayedRows={({ from, to, count }) =>
        count === 0 ? 'Nenhum resultado' : `${String(from)}–${String(to)} de ${String(count)}`
      }
      getItemAriaLabel={(direction) =>
        direction === 'previous' ? 'Página anterior' : 'Próxima página'
      }
      slotProps={{ select: { native: true, inputProps: { 'aria-label': 'Por página' } } }}
      onPageChange={(_clickEvent, zeroBasedPage) => {
        onChangePage(zeroBasedPage + 1);
      }}
      onRowsPerPageChange={(changeEvent) => {
        const size = Number(changeEvent.target.value);
        if (isPageSize(size)) onChangePageSize(size);
      }}
    />
  );
}
