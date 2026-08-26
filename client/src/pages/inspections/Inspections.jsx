import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import DataTable, { Pagination } from '../../components/ui/DataTable';
import { TableSkeleton } from '../../components/ui/Feedback';
import { useDebounce } from '../../hooks';
import { fmtDateTime } from '../../utils/format';

export default function Inspections() {
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
        const res = await api.get('/inspections', {
          params: {
            q: debouncedQ || undefined,
            status: status || undefined,
            page: params.get('page') || 1,
            limit: 15,
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
      <PageHeader title="Inspections" subtitle="Every recorded compliance inspection with its evidence trail." />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input label="Search reference" placeholder="LMC-INS-…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="sm:w-56">
            <label className="label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="COMPLIANT">Compliant</option>
              <option value="NON_COMPLIANT">Non-compliant</option>
              <option value="REQUIRES_REVIEW">Requires review</option>
              <option value="PASS_AFTER_REVIEW">Passed after review</option>
              <option value="VIOLATION_CONFIRMED">Violation confirmed</option>
            </select>
          </div>
        </div>
      </Card>

      {loading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : (
        <>
          <DataTable
            rows={data.items}
            rowLink={(r) => `/inspections/${r._id}`}
            emptyMessage="No inspections match your filters"
            columns={[
              { key: 'inspectionId', header: 'Reference', render: (r) => <span className="font-mono text-xs font-bold text-primary-700 dark:text-primary-400">{r.inspectionId}</span> },
              { key: 'product', header: 'Product', render: (r) => (
                <span className="font-semibold text-slate-700 dark:text-slate-200">{r.productId?.productName || '—'}</span>
              ) },
              { key: 'inspector', header: 'Inspector', render: (r) => r.inspectorId?.name || '—' },
              { key: 'district', header: 'District', render: (r) => r.location?.district || '—' },
              { key: 'score', header: 'Score', render: (r) => (
                <span className={`font-bold ${r.scores?.overall >= 80 ? 'text-emerald-600' : r.scores?.overall >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                  {r.scores?.overall ?? '—'}%
                </span>
              ) },
              { key: 'createdAt', header: 'Date', render: (r) => fmtDateTime(r.createdAt) },
              { key: 'finalStatus', header: 'Status', render: (r) => <Badge status={r.finalStatus} size="xs" /> },
            ]}
          />
          {data.pagination && (
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              onChange={(page) =>
                setParams((prev) => {
                  const sp = new URLSearchParams(prev);
                  sp.set('page', String(page));
                  return sp;
                })
              }
            />
          )}
        </>
      )}
    </div>
  );
}
