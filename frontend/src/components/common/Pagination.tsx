import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  page: number; // 0-indexed
  pageSize: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
  pageSizeOptions?: number[];
  disabled?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  pageSize,
  totalElements,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
  disabled = false,
}) => {
  const startItem = totalElements === 0 ? 0 : page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, totalElements);
  const effectiveTotalPages = Math.max(1, totalPages);

  const canPrev = page > 0 && !disabled;
  const canNext = page < effectiveTotalPages - 1 && !disabled;

  return (
    <div className="pagination-bar" data-testid="pagination-menu">
      <div className="pagination-info">
        <span>
          Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of{' '}
          <strong>{totalElements}</strong> items
        </span>
      </div>

      <div className="pagination-controls">
        <div className="pagination-size-selector">
          <label htmlFor="page-size-select" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Rows per page:
          </label>
          <select
            id="page-size-select"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={disabled}
            className="pagination-select"
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="pagination-nav">
          <button
            type="button"
            className="pagination-btn"
            onClick={() => onPageChange(0)}
            disabled={!canPrev}
            aria-label="First page"
            title="First page"
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            type="button"
            className="pagination-btn"
            onClick={() => onPageChange(page - 1)}
            disabled={!canPrev}
            aria-label="Previous page"
            title="Previous page"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="pagination-current-page" aria-live="polite">
            Page <strong>{page + 1}</strong> of <strong>{effectiveTotalPages}</strong>
          </span>

          <button
            type="button"
            className="pagination-btn"
            onClick={() => onPageChange(page + 1)}
            disabled={!canNext}
            aria-label="Next page"
            title="Next page"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            className="pagination-btn"
            onClick={() => onPageChange(effectiveTotalPages - 1)}
            disabled={!canNext}
            aria-label="Last page"
            title="Last page"
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
