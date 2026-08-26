import { FlaskConical, Loader2 } from 'lucide-react';
import { DEMO_SCENARIOS } from '../../constants';

/**
 * Demo-mode bar shown when OCR provider is simulated.
 * variant: current scenario value or null
 */
export default function DemoModeBar({ variant, onChange, busy }) {
  return (
    <div
      data-testid="demo-bar"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 dark:border-violet-900/60 dark:bg-violet-950/40"
    >
      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
        Demo mode
      </span>
      <div className="flex flex-wrap gap-2">
        {DEMO_SCENARIOS.map((s) => (
          <button
            key={s.value}
            type="button"
            disabled={busy}
            onClick={() => onChange?.(s.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              variant === s.value
                ? 'bg-violet-600 text-white'
                : 'bg-white text-violet-700 hover:bg-violet-100 dark:bg-slate-800 dark:text-violet-300 dark:hover:bg-slate-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
