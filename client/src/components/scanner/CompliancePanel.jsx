import { AlertTriangle, CheckCircle2, Info, ShieldQuestion, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Badge from '../ui/Badge';
import { ScoreRing, ProgressBar } from '../ui/StatCard';
import { STATUS_META, SEVERITY_META } from '../../constants';

function ExplainRow({ check }) {
  const [open, setOpen] = useState(false);
  const isViolation = Boolean(check.passed === false && (check.rule?.severity || check.severity));
  const sev = check.severity || check.rule?.severity;

  return (
    <div
      className={`rounded-xl border px-3.5 py-3 ${
        isViolation
          ? 'border-red-200 bg-red-50/60 dark:border-red-900/50 dark:bg-red-950/30'
          : check.status === 'WARNING'
            ? 'border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/30'
            : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40'
      }`}
    >
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-start justify-between gap-3 text-left">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            {check.ruleId}
            <Badge status={isViolation ? 'NON_COMPLIANT' : check.status === 'WARNING' ? 'REQUIRES_REVIEW' : 'COMPLIANT'} size="xs" />
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {check.explanation?.whatWasFound || check.message}
          </p>
        </div>
        <ChevronDown size={16} className={`mt-1 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <dl className="mt-3 space-y-2 border-t border-slate-200 pt-3 text-xs dark:border-slate-700">
              {check.explanation?.whatWasExpected && (
                <div>
                  <dt className="font-bold uppercase tracking-wide text-slate-400">What was expected</dt>
                  <dd className="mt-0.5 text-slate-600 dark:text-slate-300">{check.explanation.whatWasExpected}</dd>
                </div>
              )}
              {check.explanation?.whatWasFound && (
                <div>
                  <dt className="font-bold uppercase tracking-wide text-slate-400">What was found</dt>
                  <dd className="mt-0.5 text-slate-600 dark:text-slate-300">{check.explanation.whatWasFound}</dd>
                </div>
              )}
              {check.explanation?.legalReference && (
                <div>
                  <dt className="font-bold uppercase tracking-wide text-slate-400">Legal basis</dt>
                  <dd className="mt-0.5 italic text-primary-700 dark:text-primary-300">{check.explanation.legalReference}</dd>
                </div>
              )}
              {check.explanation?.remediationHint && (
                <div>
                  <dt className="font-bold uppercase tracking-wide text-slate-400">Remediation</dt>
                  <dd className="mt-0.5 text-slate-600 dark:text-slate-300">{check.explanation.remediationHint}</dd>
                </div>
              )}
              {sev && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-slate-400 uppercase tracking-wide font-bold">Severity</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SEVERITY_META[sev]?.cls || ''}`}>
                    {SEVERITY_META[sev]?.label || sev}
                  </span>
                </div>
              )}
            </dl>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CompliancePanel({ result }) {
  if (!result) return null;
  const { status, scores = {}, summary = {}, checks = [], violations = [], warnings = [], engineVersion } = result;

  return (
    <div data-testid="compliance-panel" className="space-y-4">
      {/* Verdict header */}
      <div className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <ScoreRing value={scores.overall ?? 0} status={status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {STATUS_META[status]?.label || status}
            </h3>
            <Badge status={status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {summary.violationCount > 0
              ? `${summary.violationCount} violation${summary.violationCount > 1 ? 's' : ''}`
              : 'No violations'}
            {summary.warningCount > 0 ? ` · ${summary.warningCount} warning${summary.warningCount > 1 ? 's' : ''}` : ''}
            {' · '}
            {summary.checksPerformed ?? checks.length} rules evaluated
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <ProgressBar label="Mandatory declarations" value={scores.mandatoryDeclarations} />
            <ProgressBar label="Readability" value={scores.readability} />
            <ProgressBar label="Data completeness" value={scores.dataCompleteness} />
          </div>
        </div>
      </div>

      {/* Warnings banner */}
      {warnings?.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-300">
            <ShieldQuestion size={16} /> Manual verification advised
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-amber-700/90 dark:text-amber-300/90">
            {warnings.map((w, i) => (
              <li key={i}>{w.message || w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Checks */}
      <div className="space-y-2">
        {checks.map((c, i) => (
          <ExplainRow key={c.ruleId || i} check={c} />
        ))}
      </div>

      {engineVersion && (
        <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Info size={12} /> Deterministic evaluation · engine v{engineVersion.replace('engine-', '')} · advisory rules do not alter the final verdict
        </p>
      )}
    </div>
  );
}
