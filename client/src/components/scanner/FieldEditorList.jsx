import { useState } from 'react';
import { CheckCircle2, RotateCcw, Plus } from 'lucide-react';
import { FIELD_GROUPS } from '../../constants';

function confidenceTone(c) {
  if (c == null) return 'text-slate-400';
  if (c >= 0.85) return 'text-emerald-600 dark:text-emerald-400';
  if (c >= 0.6) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-500';
}

/**
 * Editable declaration list grouped by category.
 * value shape per field key: { value, confidence, humanVerified }
 */
export default function FieldEditorList({ declarations = {}, onChange }) {
  const [showAdd, setShowAdd] = useState(false);

  const setField = (key, patch) =>
    onChange({
      ...declarations,
      [key]: {
        ...(declarations[key] || { confidence: null }),
        ...patch,
        humanVerified: true,
      },
    });

  const clearField = (key) => {
    const next = { ...declarations };
    delete next[key];
    onChange(next);
  };

  const missingKeys = FIELD_GROUPS.flatMap((g) => g.fields)
    .map((f) => f.key)
    .filter((k) => !declarations[k]);

  return (
    <div className="space-y-5">
      {FIELD_GROUPS.map((group) => (
        <div key={group.group}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {group.group}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.fields.map((f) => {
              const entry = declarations[f.key];
              const verified = Boolean(entry?.humanVerified);
              return (
                <div key={f.key} data-field={f.key}>
                  <label className="label flex items-center gap-1.5">
                    {f.label}
                    {entry && !verified && entry.confidence != null && (
                      <span className={`text-[10px] font-semibold ${confidenceTone(entry.confidence)}`}>
                        OCR {(entry.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                    {verified && (
                      <CheckCircle2 size={13} className="text-emerald-500" title="Human verified" />
                    )}
                  </label>
                  <div className="relative">
                    <input
                      className={`input pr-8 ${verified ? 'border-emerald-400/70 bg-emerald-50/40 dark:border-emerald-700/60 dark:bg-emerald-900/10' : ''}`}
                      placeholder={f.placeholder || '—'}
                      value={entry?.value ?? ''}
                      onChange={(e) => setField(f.key, { value: e.target.value })}
                    />
                    {entry?.value && (
                      <button
                        type="button"
                        title="Clear field"
                        onClick={() => clearField(f.key)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 transition hover:text-red-400"
                      >
                        <RotateCcw size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Add a field the OCR missed */}
      <div>
        {!showAdd ? (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:underline dark:text-primary-400"
          >
            <Plus size={13} /> Field missing? Add it manually
          </button>
        ) : (
          <select
            autoFocus
            className="input max-w-xs"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                setField(e.target.value, { value: '' });
                setShowAdd(false);
              }
            }}
          >
            <option value="" disabled>
              Select field to add…
            </option>
            {missingKeys.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
