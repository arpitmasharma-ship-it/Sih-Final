import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, PackageSearch, ClipboardList, Scale, Loader2, FileText, Sparkles } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { CATEGORIES } from '../../constants';
import { useDebounce } from '../../hooks';
import { fmtDate } from '../../utils/format';

export default function SearchResults() {
  const [params, setParams] = useSearchParams();
  const qParam = params.get('q') || '';
  const category = params.get('category') || '';
  const severity = params.get('severity') || '';

  const [text, setText] = useState(qParam);
  const debouncedText = useDebounce(text, 300);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  // Sync input text when query param in URL changes from external source (like Topbar)
  useEffect(() => {
    setText(qParam);
  }, [qParam]);

  // Sync URL search param when debounced text changes
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (debouncedText?.trim()) {
      next.set('q', debouncedText.trim());
    } else {
      next.delete('q');
    }
    if (next.toString() !== params.toString()) {
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedText]);

  const activeQuery = debouncedText?.trim() || qParam?.trim();
  const hasQuery = Boolean(activeQuery || category || severity);

  useEffect(() => {
    if (!hasQuery) {
      setResults(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    api
      .get('/search', {
        params: {
          q: activeQuery || undefined,
          category: category || undefined,
          severity: severity || undefined,
          limit: 12,
        },
      })
      .then((res) => alive && setResults(res.data.data))
      .catch(() => alive && setResults({ products: [], inspections: [], reports: [], rules: [] }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [activeQuery, category, severity, hasQuery]);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  return (
    <div>
      <PageHeader title="Search" subtitle="Find products, inspections, reports, and rule codes across the platform." />

      <Card className="mb-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: text.trim() });
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <Input
              label="Query"
              placeholder="Product name, brand, LMC-INS ref, report ref, rule code…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input sm:w-44" value={category} onChange={(e) => update({ category: e.target.value })}>
              <option value="">Any</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Severity</label>
            <select className="input sm:w-36" value={severity} onChange={(e) => update({ severity: e.target.value })}>
              <option value="">Any</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
          <Button type="submit" icon={Search}>Search</Button>
        </form>
      </Card>

      {!hasQuery ? (
        <div className="py-12 text-center text-slate-400">
          <p className="text-sm">Type any keyword above to search in real time.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-slate-400 flex items-center gap-1"><Sparkles size={13} /> Quick searches:</span>
            {['CRUNCHY', 'LMC-INS', 'LMC-RPT', 'MRP', 'FOOD'].map((s) => (
              <button
                key={s}
                onClick={() => setText(s)}
                className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-primary-700 dark:text-primary-400 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : loading || !results ? (
        <p className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
          <Loader2 size={16} className="animate-spin" /> Searching…
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* Products */}
          <Card>
            <CardTitle icon={PackageSearch}>Products ({results.products?.length || 0})</CardTitle>
            {(!results.products || results.products.length === 0) && <p className="text-sm text-slate-400 py-4">No matching products</p>}
            <ul className="space-y-2">
              {(results.products || []).map((p) => (
                <li key={p._id}>
                  <Link to={`/products/${p._id}`} className="-mx-2 block rounded-lg px-2 py-2 transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{p.productName}</span>
                      <Badge status={p.complianceStatus} size="xs" />
                    </div>
                    <p className="text-xs text-slate-400">{p.brandName || p.manufacturer || p.category}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {/* Inspections */}
          <Card>
            <CardTitle icon={ClipboardList}>Inspections ({results.inspections?.length || 0})</CardTitle>
            {(!results.inspections || results.inspections.length === 0) && <p className="text-sm text-slate-400 py-4">No matching inspections</p>}
            <ul className="space-y-2">
              {(results.inspections || []).map((i) => (
                <li key={i._id}>
                  <Link to={`/inspections/${i._id}`} className="-mx-2 block rounded-lg px-2 py-2 transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-primary-700 dark:text-primary-400">{i.inspectionId}</span>
                      <Badge status={i.finalStatus} size="xs" />
                    </div>
                    <p className="text-xs text-slate-400">
                      {i.productId?.productName || '—'} · {fmtDate(i.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {/* Reports */}
          <Card>
            <CardTitle icon={FileText}>Reports ({results.reports?.length || 0})</CardTitle>
            {(!results.reports || results.reports.length === 0) && <p className="text-sm text-slate-400 py-4">No matching reports</p>}
            <ul className="space-y-2">
              {(results.reports || []).map((r) => (
                <li key={r._id}>
                  <Link to="/reports" className="-mx-2 block rounded-lg px-2 py-2 transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-primary-700 dark:text-primary-400">{r.reportId}</span>
                      <Badge status={r.snapshot?.finalStatus} size="xs" />
                    </div>
                    <p className="text-xs text-slate-400">
                      {r.snapshot?.productName || '—'} · {fmtDate(r.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {/* Rules */}
          <Card>
            <CardTitle icon={Scale}>Rules ({results.rules?.length || 0})</CardTitle>
            {(!results.rules || results.rules.length === 0) && <p className="text-sm text-slate-400 py-4">No matching rules</p>}
            <ul className="space-y-2">
              {(results.rules || []).map((r) => (
                <li key={r._id} className="-mx-2 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-primary-700 dark:text-primary-400">{r.ruleCode}</span>
                    <Badge status={r.severity || 'LOW'} size="xs" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 line-clamp-2">{r.title}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
