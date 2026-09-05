"use client";

import React from 'react';
import { Button } from './Button';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T | string;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
  onRowClick?: (row: T) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  className?: string;
  bare?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  keyField,
  loading = false,
  emptyMessage = 'No data available',
  emptyIcon = '📭',
  onRowClick,
  pagination,
  className = '',
  bare = false,
}: DataTableProps<T>) {
  const getKey = (row: T) => String(row[keyField as keyof T]);

  const wrapperClass = bare ? className : `bg-white border border-[var(--border)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden ${className}`;

  if (loading) {
    return (
      <div className={wrapperClass}>
        <div className="p-5">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-[var(--bg-input)] rounded w-3/4" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-[var(--bg-input)] rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className={wrapperClass}>
        <div className="text-center py-16 px-6">
          <div className="text-5xl mb-4">{emptyIcon}</div>
          <h3 className="text-[15px] font-medium text-[var(--text-body)] mb-1">No Data</h3>
          <p className="text-[13px] text-[var(--text-muted)] max-w-md mx-auto">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" role="grid">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8A94A6] bg-white ${col.className || ''}`}
                  scope="col"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={getKey(row)}
                className={`border-b border-[rgba(232,237,245,0.5)] transition-colors duration-150 ${
                  onRowClick ? 'cursor-pointer hover:bg-[#F8FBFF]' : ''
                } ${rowIndex === data.length - 1 ? 'border-b-0' : ''}`}
                onClick={() => onRowClick?.(row)}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onRowClick(row);
                  }
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-5 py-3.5 text-[13px] font-medium text-[#475569] ${col.className || ''}`}
                  >
                    {col.render ? col.render(row, rowIndex) : String(row[col.key as keyof T] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = React.useMemo(() => {
    const result: (number | 'ellipsis')[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) result.push(i);
    } else {
      result.push(1);
      if (currentPage > 3) result.push('ellipsis');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) result.push(i);
      if (currentPage < totalPages - 2) result.push('ellipsis');
      result.push(totalPages);
    }
    return result;
  }, [currentPage, totalPages]);

  return (
    <div className="flex items-center justify-center gap-1.5 p-4 border-t border-[var(--border)]">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M15 19l-7-7 7-7" />
        </svg>
      </Button>
      
      {pages.map((page, i) =>
        page === 'ellipsis' ? (
          <span key={`ellipsis-${i}`} className="px-1.5 text-[var(--text-muted)] text-[12px]">...</span>
        ) : (
          <Button
            key={page}
            variant={page === currentPage ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onPageChange(page)}
            className={page === currentPage ? '' : 'text-[var(--text-body)] hover:text-[var(--text-heading)]'}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </Button>
        )
      )}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </Button>
      
      <span className="text-[11px] text-[var(--text-muted)] ml-2">
        Page {currentPage} of {totalPages}
      </span>
    </div>
  );
}
