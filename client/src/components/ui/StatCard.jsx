export default function StatCard({ icon: Icon, label, value, tone = 'blue', sub, loading, trend }) {
  const tones = {
    blue: {
      border: 'border-slate-200 dark:border-slate-800',
      icon: 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-800',
      accent: 'text-primary-700 dark:text-primary-300',
    },
    green: {
      border: 'border-slate-200 dark:border-slate-800',
      icon: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800',
      accent: 'text-emerald-700 dark:text-emerald-300',
    },
    red: {
      border: 'border-slate-200 dark:border-slate-800',
      icon: 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800',
      accent: 'text-red-700 dark:text-red-300',
    },
    amber: {
      border: 'border-slate-200 dark:border-slate-800',
      icon: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800',
      accent: 'text-amber-700 dark:text-amber-300',
    },
    purple: {
      border: 'border-slate-200 dark:border-slate-800',
      icon: 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800',
      accent: 'text-indigo-700 dark:text-indigo-300',
    },
    slate: {
      border: 'border-slate-200 dark:border-slate-800',
      icon: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
      accent: 'text-slate-700 dark:text-slate-300',
    },
  };

  const style = tones[tone] || tones.blue;

  return (
    <div
      className={`relative rounded-xl border ${style.border} bg-white dark:bg-slate-900 p-5 shadow-xs transition hover:border-slate-300 dark:hover:border-slate-700`}
      data-testid="stat-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </div>
          {loading ? (
            <div className="my-1.5 h-8 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          ) : (
            <div className="my-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {value ?? '0'}
            </div>
          )}
          {sub && (
            <div className="truncate text-xs text-slate-500 dark:text-slate-400">
              {sub}
            </div>
          )}
        </div>

        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${style.icon}`}>
          {Icon && <Icon size={20} />}
        </div>
      </div>

      {trend && (
        <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}

const STATUS_COLOR = {
  COMPLIANT: '#10b981',
  PASS_AFTER_REVIEW: '#10b981',
  REQUIRES_REVIEW: '#f59e0b',
  NON_COMPLIANT: '#ef4444',
  VIOLATION_CONFIRMED: '#ef4444',
};

export function ScoreRing({ value = 0, size = 120, stroke = 10, status }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const color =
    STATUS_COLOR[status] || (pct >= 80 ? '#10b981' : pct >= 55 ? '#f59e0b' : '#ef4444');
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${pct}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray .8s ease' }}
      />
      <text data-testid="score-value" x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.22} fontWeight="800" fill="currentColor" className="text-slate-800 dark:text-white">
        {pct}%
      </text>
      <text x="50%" y="66%" textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.09} fill="#94a3b8">
        SCORE
      </text>
    </svg>
  );
}

export function ProgressBar({ value = 0, tone, label }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const color = tone || (pct >= 80 ? 'bg-emerald-500' : pct >= 55 ? 'bg-amber-500' : 'bg-red-500');
  return (
    <div>
      {label && <p className="mb-1 truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`, transition: 'width .6s ease' }} />
      </div>
    </div>
  );
}
