export default function StatCard({ icon: Icon, label, value, tone = 'blue', sub, loading }) {
  const tones = {
    blue: 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  };
  return (
    <div className="card flex items-center gap-4 p-4" data-testid="stat-card">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        {Icon && <Icon size={21} />}
      </div>
      <div className="min-w-0">
        {loading ? (
          <div className="h-7 w-14 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        ) : (
          <div className="text-xl font-extrabold leading-tight text-slate-900 dark:text-white">{value ?? '—'}</div>
        )}
        <div className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
        {sub && <div className="truncate text-[11px] text-slate-400">{sub}</div>}
      </div>
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
