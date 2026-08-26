import { Link } from 'react-router-dom';
import { ShieldCheck, Scale, FileSearch, ScanLine } from 'lucide-react';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary-900 p-10 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary-700/50 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-[28rem] w-[28rem] rounded-full bg-accent-500/20 blur-3xl" />
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-lg font-extrabold tracking-tight">LMCC Platform</p>
            <p className="text-xs text-primary-200">Legal Metrology Compliance Intelligence</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-8">
          <h2 className="text-3xl font-extrabold leading-tight">
            Automated packaged-commodity compliance for enforcement teams.
          </h2>
          <ul className="space-y-4 text-sm text-primary-100">
            {[
              [ScanLine, 'Scan labels — OCR extracts mandatory declarations'],
              [Scale, 'Deterministic rule engine under LMPC Rules, 2011'],
              [FileSearch, 'Evidence-backed violations with full explainability'],
            ].map(([Icon, text]) => (
              <li key={text} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon size={15} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-primary-300/80">
          Department of Consumer Affairs · Legal Metrology (Packaged Commodities) Rules, 2011
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950 lg:w-1/2">
        <Link to="/login" className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-800 text-white">
            <ShieldCheck size={19} />
          </div>
          <span className="font-extrabold text-slate-900 dark:text-white">LMCC Platform</span>
        </Link>
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
