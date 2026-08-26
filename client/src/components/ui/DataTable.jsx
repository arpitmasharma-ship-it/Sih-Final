import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Generic data table. columns: [{key, header, render?(row), className?}]
 * rowLink(row) -> path navigated on row click.
 */
export default function DataTable({ columns, rows, keyField = '_id', rowLink, emptyMessage = 'No records found', loading }) {
  const navigate = useNavigate();
  if (loading) return null;
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="table-head">
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 font-bold">{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows?.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {rows?.map((row) => {
              const content = (
                <>
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 align-middle ${c.className || ''}`}>
                      {c.render ? c.render(row) : (row[c.key] ?? '—')}
                    </td>
                  ))}
                </>
              );
              const id = row[keyField];
              return (
                <tr
                  key={id}
                  className={`border-t border-slate-100 dark:border-slate-800 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${rowLink ? 'cursor-pointer' : ''}`}
                  onClick={rowLink ? () => navigate(rowLink(row)) : undefined}
                >
                  {content}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const nums = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) nums.push(i);
  return (
    <div className="mt-4 flex items-center justify-center gap-1.5">
      <PageBtn disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft size={15} />
      </PageBtn>
      {nums[0] > 1 && <span className="text-xs text-slate-400">…</span>}
      {nums.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`h-8 w-8 rounded-lg text-sm font-semibold transition ${
            n === page
              ? 'bg-primary-800 text-white'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          {n}
        </button>
      ))}
      {nums[nums.length - 1] < totalPages && <span className="text-xs text-slate-400">…</span>}
      <PageBtn disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        <ChevronRight size={15} />
      </PageBtn>
    </div>
  );
}

function PageBtn({ children, disabled, onClick }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  );
}
