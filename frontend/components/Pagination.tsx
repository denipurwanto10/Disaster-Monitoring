'use client';

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  itemLabel?: string;
};

type PageToken = number | 'start-gap' | 'end-gap';

function pageTokens(page: number, totalPages: number): PageToken[] {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const visible = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...visible].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
  const result: PageToken[] = [];

  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) {
      result.push(value - sorted[index - 1] === 2 ? sorted[index - 1] + 1 : index === 1 ? 'start-gap' : 'end-gap');
    }
    result.push(value);
  });

  return result;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize = 20,
  itemLabel = 'data',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const end = totalItems ? Math.min(currentPage * pageSize, totalItems) : 0;
  const tokens = pageTokens(currentPage, totalPages);

  return (
    <nav
      aria-label="Navigasi halaman data"
      className="flex flex-col gap-3 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-3 shadow-[0_1px_2px_rgba(21,33,30,0.03)] sm:flex-row sm:items-center sm:justify-between sm:px-4"
    >
      {totalItems != null && (
        <p className="text-xs tabular-nums text-[color:var(--ink-3)]" aria-live="polite">
          Menampilkan <strong className="font-semibold text-[color:var(--ink-2)]">{start}–{end}</strong> dari{' '}
          <strong className="font-semibold text-[color:var(--ink-2)]">{totalItems.toLocaleString('id-ID')}</strong> {itemLabel}
        </p>
      )}

      <div className="flex items-center justify-between gap-1.5 sm:justify-end" aria-label={`Halaman ${currentPage} dari ${totalPages}`}>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-[color:var(--line)] px-3 text-xs font-semibold text-[color:var(--ink-2)] transition-colors hover:bg-[color:var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <span className="hidden sm:inline">Sebelumnya</span>
          <span className="sm:hidden" aria-hidden="true">←</span>
        </button>

        <span className="min-w-[3.5rem] text-center text-xs font-semibold tabular-nums text-[color:var(--ink-2)] sm:hidden" aria-live="polite">
          {currentPage} / {totalPages}
        </span>

        <div className="hidden items-center gap-1 sm:flex" aria-label="Pilih halaman">
          {tokens.map((token, index) => {
            if (typeof token !== 'number') {
              return (
                <span key={`${token}-${index}`} className="flex h-9 w-6 items-center justify-center text-xs text-[color:var(--ink-4)]" aria-hidden="true">
                  …
                </span>
              );
            }
            const active = token === currentPage;
            return (
              <button
                key={token}
                type="button"
                onClick={() => onPageChange(token)}
                aria-label={`Buka halaman ${token}`}
                aria-current={active ? 'page' : undefined}
                className={`dm-pagination-number h-9 min-w-9 rounded-lg px-2 text-xs font-semibold tabular-nums transition-colors ${
                  active
                    ? 'bg-[color:var(--basalt)] text-white shadow-sm'
                    : 'text-[color:var(--ink-2)] hover:bg-[color:var(--surface-2)]'
                }`}
              >
                {token}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-[color:var(--line)] px-3 text-xs font-semibold text-[color:var(--ink-2)] transition-colors hover:bg-[color:var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <span className="hidden sm:inline">Berikutnya</span>
          <span className="sm:hidden" aria-hidden="true">→</span>
        </button>
      </div>
    </nav>
  );
}
