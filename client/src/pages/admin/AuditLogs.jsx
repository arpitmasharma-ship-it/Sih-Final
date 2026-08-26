import { useEffect, useState } from 'react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import DataTable, { Pagination } from '../../components/ui/DataTable';
import { TableSkeleton } from '../../components/ui/Feedback';
import { fmtDateTime } from '../../utils/format';

const ACTION_TONE = {
  LOGIN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  LOGOUT: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  LOGIN_FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export default function AuditLogs() {
  const [data, setData] = useState({ items: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [actionsList, setActionsList] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get('/audit-logs/actions').then((r) => setActionsList(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/audit-logs', {
          params: { action: action || undefined, entity: entity || undefined, page, limit: 15 },
        });
        setData({
          items: Array.isArray(res.data.data) ? res.data.data : [],
          pagination: res.data.pagination || null,
        });
      } catch {
        setData({ items: [], pagination: null });
      } finally {
        setLoading(false);
      }
    })();
  }, [action, entity, page]);

  return (
    <div>
      <PageHeader title="Audit logs" subtitle="Immutable trail of security-relevant actions across the platform." />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Action</label>
            <select
              className="input"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All actions</option>
              {actionsList.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
          <Input
            label="Entity"
            placeholder="e.g. Inspection"
            value={entity}
            onChange={(e) => {
              setEntity(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </Card>

      {loading ? (
        <TableSkeleton rows={10} cols={5} />
      ) : (
        <>
          <DataTable
            rows={data.items}
            emptyMessage="No log entries"
            columns={[
              { key: 'createdAt', header: 'Time', render: (l) => fmtDateTime(l.createdAt) },
              { key: 'userName', header: 'User', render: (l) => l.userName || 'system' },
              { key: 'action', header: 'Action', render: (l) => (
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${ACTION_TONE[l.action] || 'bg-primary-50 text-primary-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                  {l.action}
                </span>
              ) },
              { key: 'entity', header: 'Entity', render: (l) => (
                <span className="text-xs">{[l.entity, l.entityId].filter(Boolean).join(' · ') || '—'}</span>
              ) },
              { key: 'ipAddress', header: 'IP', render: (l) => <span className="font-mono text-xs text-slate-400">{l.ipAddress || '—'}</span> },
            ]}
          />
          {data.pagination && (
            <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
