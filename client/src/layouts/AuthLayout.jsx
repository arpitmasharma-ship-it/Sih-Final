import { Link } from 'react-router-dom';
import { ShieldCheck, Scale, FileText, CheckCircle2, Lock, HelpCircle, Phone, Globe } from 'lucide-react';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between">
      {/* Top Official National Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-2 shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-3">
            <span className="flex h-5 w-7 items-center justify-center rounded-xs overflow-hidden shadow-xs border border-slate-300 dark:border-slate-700">
              <div className="h-full w-full flex flex-col">
                <div className="h-1/3 bg-[#FF9933]" />
                <div className="h-1/3 bg-white flex items-center justify-center">
                  <div className="h-1 w-1 rounded-full bg-[#000080]" />
                </div>
                <div className="h-1/3 bg-[#138808]" />
              </div>
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              भारत सरकार | Government of India
            </span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
            <span className="hidden sm:inline text-slate-500 dark:text-slate-400">
              उपभोक्ता मामले विभाग · Department of Consumer Affairs
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span className="hidden md:inline">Legal Metrology (Packaged Commodities) Division</span>
            <span className="flex items-center gap-1 text-primary-700 dark:text-primary-400 font-semibold">
              <Lock size={12} /> Secure Portal
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
          
          {/* Left Institutional Overview Panel */}
          <div className="lg:col-span-6 bg-slate-900 text-white p-8 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
            <div className="space-y-6">
              {/* Emblem / Title */}
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-800 text-white shadow-md border border-primary-700">
                  <Scale size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-white leading-snug">
                    LMCC Enforcement Portal
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    Legal Metrology Compliance & Verification System
                  </p>
                </div>
              </div>

              {/* Portal Information Box */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-accent-400 uppercase tracking-wider">
                  <ShieldCheck size={15} />
                  <span>Statutory Compliance Directive</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  National digital enforcement platform mandated for verification of packaged commodities under the <strong>Legal Metrology (Packaged Commodities) Rules, 2011</strong>.
                </p>
              </div>

              {/* Core Verification Functions */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Core Inspection Modules
                </p>
                <div className="space-y-2.5 text-xs text-slate-300">
                  {[
                    'Automated OCR label declaration extraction (MRP, Net Qty, Dates)',
                    'Rule-based statutory compliance validation under LMPC 2011',
                    'Standard unit-sale price verification & manufacturer cross-checks',
                    'Evidence-backed digital inspection dossier & audit registry',
                  ].map((text, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <CheckCircle2 size={15} className="mt-0.5 text-emerald-400 shrink-0" />
                      <span className="leading-snug">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Support Info */}
            <div className="mt-8 border-t border-slate-800/80 pt-4 text-xs text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Phone size={13} className="text-slate-400" />
                <span>Helpdesk: 1800-11-4000</span>
              </div>
              <span>DCA · LMPC Division</span>
            </div>
          </div>

          {/* Right Login Box */}
          <div className="lg:col-span-6 p-8 sm:p-10 flex flex-col justify-center bg-white dark:bg-slate-900">
            <div className="max-w-md mx-auto w-full">
              <div className="mb-6">
                <span className="inline-block rounded-md bg-primary-50 dark:bg-primary-950/80 px-2.5 py-1 text-[11px] font-bold text-primary-700 dark:text-primary-300 mb-2 border border-primary-200 dark:border-primary-800">
                  Officer Authentication
                </span>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {title}
                </h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {subtitle}
                </p>
              </div>

              {children}
            </div>
          </div>
        </div>
      </main>

      {/* Official Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3 px-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <p>© 2026 Legal Metrology Division, Department of Consumer Affairs, Government of India. All rights reserved.</p>
          <p className="text-slate-400">Designed for Authorized Enforcement & Inspection Officers</p>
        </div>
      </footer>
    </div>
  );
}
