import { STATUS_META, SEVERITY_META } from '../../constants';

export default function Badge({ status, severity, className = '', size = 'sm', label }) {
  const meta = severity ? SEVERITY_META[severity] : STATUS_META[status] || { label: status || '—', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
  return (
    <span
      data-testid={severity ? `sev-${severity}` : `status-${status}`}
      className={`inline-flex items-center gap-1.5 rounded-full font-bold ${
        size === 'xs' ? 'px-2 py-0 text-[10px]' : 'px-2.5 py-0.5 text-[11px]'
      } ${meta.cls} ${className}`}
    >
      {!severity && meta.dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.dot }} />}
      {label || meta.label}
    </span>
  );
}

export function CheckStatusBadge({ status }) {
  const map = {
    PASS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    FAIL: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    WARNING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    NOT_APPLICABLE: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  };
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${map[status] || map.NOT_APPLICABLE}`}>
      {String(status).replace(/_/g, ' ')}
    </span>
  );
}
