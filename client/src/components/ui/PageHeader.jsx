import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function PageHeader({ title, subtitle, breadcrumbs = [], actions }) {
  return (
    <div className="mb-6">
      {breadcrumbs.length > 0 && (
        <nav className="mb-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          {breadcrumbs.map((b, i) => (
            <span key={`${b.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={13} className="opacity-60" />}
              {b.to ? (
                <Link to={b.to} className="font-medium hover:text-primary-600 dark:hover:text-primary-400">
                  {b.label}
                </Link>
              ) : (
                <span className="font-semibold text-slate-700 dark:text-slate-300">{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
