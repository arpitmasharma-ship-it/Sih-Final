import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PackageSearch, Plus } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { TableSkeleton, EmptyState } from '../../components/ui/Feedback';
import Pagination from '../../components/ui/DataTable';
import { useDebounce } from '../../hooks';
import { fmtDate } from '../../utils/format';

export default function Products() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ items: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(params.get('q') || '');
  const [status, setStatus] = useState(params.get('status') || '');
  const debouncedQ = useDebounce(q);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/products', {
          params: {
            q: debouncedQ || undefined,
            status: status || undefined,
            page: params.get('page') || 1,
            limit: 12,
          },
        });
        setData({ items: Array.isArray(res.data.data) ? res.data.data : [], pagination: res.data.pagination || null });
      } catch {
        setData({ items: [], pagination: null });
      } finally {
        setLoading(false);
      }
    })();
  }, [debouncedQ, status, params]);

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Every scanned packaged commodity and its latest compliance status."
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input label="Search" placeholder="Name, brand or barcode…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="sm:w-52">
            <label className="label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="COMPLIANT">Compliant</option>
              <option value="NON_COMPLIANT">Non-compliant</option>
              <option value="REQUIRES_REVIEW">Requires review</option>
            </select>
          </div>
          <Button icon={Plus} onClick={() => navigate('/scanner')}>
            New scan
          </Button>
        </div>
      </Card>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={PackageSearch} title="No products found" message="Scan a package to add your first product record." actionLabel="Open scanner" to="/scanner" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((p) => (
              <Link key={p._id} to={`/products/${p._id}`} data-testid={`product-${p.productName}`}>
                <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-pop">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 font-bold text-slate-800 dark:text-slate-100">{p.productName}</p>
                    <Badge status={p.complianceStatus} size="xs" />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{p.brandName || '—'} · {p.category}</p>
                  <dl className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex justify-between"><dt>MRP</dt><dd className="font-semibold">{p.extractedDeclarations?.MRP?.value || '—'}</dd></div>
                    <div className="flex justify-between"><dt>Net qty</dt><dd className="font-semibold">{p.extractedDeclarations?.NET_QUANTITY?.value || '—'}</dd></div>
                    <div className="flex justify-between"><dt>Last inspected</dt><dd>{fmtDate(p.updatedAt)}</dd></div>
                  </dl>
                </Card>
              </Link>
            ))}
          </div>

          {data.pagination && data.pagination.totalPages > 1 && (
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              onChange={(page) => setParams((prev) => {
                const sp = new URLSearchParams(prev);
                sp.set('page', String(page));
                return sp;
              })}
            />
          )}
        </>
      )}
    </div>
  );
}
