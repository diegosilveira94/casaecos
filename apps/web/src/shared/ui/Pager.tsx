import { useId } from 'react';

import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from './icons.js';
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
  const sizeId = useId();

  return (
    <nav className="pager" aria-label="Paginação">
      <p className="pager__range">
        {window.total === 0
          ? 'Nenhum resultado'
          : `${String(window.firstPosition)}–${String(window.lastPosition)} de ${String(window.total)}`}
      </p>
      <div className="pager__size">
        <label htmlFor={sizeId}>Por página</label>
        <div className="form-select form-select--compact">
          <select
            id={sizeId}
            value={pageSize}
            onChange={(changeEvent) => {
              const size = Number(changeEvent.target.value);
              if (isPageSize(size)) onChangePageSize(size);
            }}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <ChevronDownIcon />
        </div>
      </div>
      <div className="pager__steps">
        <button
          className="icon-button"
          type="button"
          aria-label="Página anterior"
          disabled={window.page === 1}
          onClick={() => {
            onChangePage(window.page - 1);
          }}
        >
          <ChevronLeftIcon />
        </button>
        <span>
          Página {window.page} de {window.pageCount}
        </span>
        <button
          className="icon-button"
          type="button"
          aria-label="Próxima página"
          disabled={window.page === window.pageCount}
          onClick={() => {
            onChangePage(window.page + 1);
          }}
        >
          <ChevronRightIcon />
        </button>
      </div>
    </nav>
  );
}
