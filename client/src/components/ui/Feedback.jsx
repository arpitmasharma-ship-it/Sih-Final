import { Link } from 'react-router-dom';
import { ChevronRight, Inbox } from 'lucide-react';

export function Skeleton({ className = '', style }) {
  return (
    <div style={style} className={`relative overflow-hidden rounded-lg bg-slate-200/70 dark:bg-slate-800 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/50 dark:via-slate-700/60 to-transparent" />
    </div>
  );
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3" style={{ width: `${85 - i * 15}%` }} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="card overflow-hidden">
      <div className="grid gap-4 bg-slate-50 dark:bg-slate-800/60 px-4 py-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-4 border-t border-slate-100 dark:border-slate-800 px-4 py-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-3.5" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Spinner({ size = 28 }) {
  return (
    <div className="flex justify-center py-10">
      <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-primary-600/30 border-t-primary-700 dark:border-primary-400/30 dark:border-t-primary-400" style={{ width: size, height: size }} />
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, message, actionLabel, onAction, to }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
        <Icon size={26} className="text-slate-400" />
      </div>
      <h3 className="font-bold text-slate-700 dark:text-slate-200">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      {actionLabel &&
        (to ? (
          <Link to={to} className="mt-5 rounded-lg bg-primary-800 hover:bg-primary-700 px-4 py-2 text-sm font-semibold text-white">
            {actionLabel}
          </Link>
        ) : (
          <button onClick={onAction} className="mt-5 rounded-lg bg-primary-800 hover:bg-primary-700 px-4 py-2 text-sm font-semibold text-white">
            {actionLabel}
          </button>
        ))}
    </div>
  );
}
