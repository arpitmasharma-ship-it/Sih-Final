import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, PackageSearch, ClipboardList, Scale, Loader2 } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { CATEGORIES } from '../../constants';
import { fmtDate } from '../../utils/format';

export default function SearchResults() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const severity = params.get('severity') || '';

  const [text, setText] = useState(q);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setText(q);
  }, [q]);

  useEffect(() => {
    if (!q && !category && !severity) {
      setResults(null);
      return;
    }
    let alive = true;
    setLoading(true);
    api
      .get('/search', { params: { q: q || undefined, category: category || undefined, severity: severity || undefined, limit: 10 } })
      .then((res) => alive && setResults(res.data.data))
      .catch(() => alive && setResults({ products: [], inspections: [], rules: [] }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [q, category, severity]);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  const hasQuery = Boolean(q || category || severity);

  return (
    <div>
      <PageHeader title="Search" subtitle="Find products, inspections and rule codes across the platform." />

      <Card className="mb-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: text.trim() });
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <Input label="Query" placeholder="Product name, brand, LMC-INS ref, rule code…" value={text} onChange={(e) => setText(e.target.value)} />
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
        <p className="py-16 text-center text-sm text-slate-400">Enter a query or filter to begin.</p>
      ) : loading || !results ? (
        <p className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
          <Loader2 size={16} className="animate-spin" /> Searching…
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Products */}
          <Card>
            <CardTitle icon={PackageSearch}>Products ({results.products.length})</CardTitle>
            {results.products.length === 0 && <p className="text-sm text-slate-400">No matches</p>}
            <ul className="space-y-2">
              {results.products.map((p) => (
                <li key={p._id}>
                  <Link to={`/products/${p._id}`} className="-mx-2 block rounded-lg px-2 py-2 transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{p.productName}</span>
                      <Badge status={p.complianceStatus} size="xs" />
                    </div>
                    <p className="text-xs text-slate-400">{p.manufacturer || p.category}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {/* Inspections */}
          <Card>
            <CardTitle icon={ClipboardList}>Inspections ({results.inspections.length})</CardTitle>
            {results.inspections.length === 0 && <p className="text-sm text-slate-400">No matches</p>}
            <ul className="space-y-2">
              {results.inspections.map((i) => (
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

          {/* Rules */}
          <Card>
            <CardTitle icon={Scale}>Rules ({results.rules.length})</CardTitle>
            {results.rules.length === 0 && <p className="text-sm text-slate-400">No matches</p>}
            <ul className="space-y-2">
              {results.rules.map((r) => (
                <li key={r._id} className="-mx-2 rounded-lg px-2 py-2">
                  <Link to="/admin/rules" className="block">
                    <span className="font-mono text-xs font-bold text-primary-700 dark:text-primary-400">{r.ruleCode}</span>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{r.title}</p>
                  </Link>
                  {!r.enabled && <Badge status="REQUIRES_REVIEW" size="xs" label="disabled" />}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
