import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FileText, Download, Braces, Plus, ShieldCheck } from 'lucide-react';
import api, { buildAssetUrl } from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import DataTable, { Pagination } from '../../components/ui/DataTable';
import { TableSkeleton, EmptyState } from '../../components/ui/Feedback';
import Modal from '../../components/ui/Modal';
import { fmtDateTime } from '../../utils/format';

export default function Reports() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ items: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(params.get('q') || '');
  const [genOpen, setGenOpen] = useState(false);
  const [inspectionRef, setInspectionRef] = useState('');
  const [generating, setGenerating] = useState(false);
  const [checksumOf, setChecksumOf] = useState(null); // report row for checksum modal

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/reports', {
          params: { q: q || undefined, page: params.get('page') || 1, limit: 12 },
        });
        setData({ items: Array.isArray(res.data.data) ? res.data.data : [], pagination: res.data.pagination || null });
      } catch {
        setData({ items: [], pagination: null });
      } finally {
        setLoading(false);
      }
    })();
  }, [q, params]);

  const generate = async () => {
    setGenerating(true);
    try {
      // Accept either a Mongo _id or an LMC-INS reference
      let inspectionId = inspectionRef.trim();
      if (!/^[0-9a-fA-F]{24}$/.test(inspectionId)) {
        const found = await api.get('/inspections', { params: { q: inspectionId } });
        const list = Array.isArray(found.data.data) ? found.data.data : [];
        const match = list.find((i) => i.inspectionId === inspectionId) || list[0];
        inspectionId = match?._id;
        if (!inspectionId) throw { friendlyMessage: `No inspection found for "${inspectionRef}"` };
      }
      await api.post('/reports', { inspectionId });
      toast.success('Report ready');
      setGenOpen(false);
      setInspectionRef('');
    } catch (e) {
      toast.error(e.friendlyMessage || 'Could not generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Official PDF compliance reports with tamper-evident checksums."
        right={
          <Button icon={Plus} onClick={() => setGenOpen(true)}>
            Generate report
          </Button>
        }
      />

      <Card className="mb-4">
        <Input label="Search" placeholder="LMC-RPT-… or product name" value={q} onChange={(e) => setQ(e.target.value)} />
      </Card>

      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={FileText} title="No reports yet" message="Generate a report from any saved inspection." actionLabel="Generate now" onAction={() => setGenOpen(true)} />
      ) : (
        <>
          <DataTable
            rows={data.items}
            emptyMessage="No reports"
            columns={[
              { key: 'reportId', header: 'Reference', render: (r) => <span className="font-mono text-xs font-bold text-primary-700 dark:text-primary-400">{r.reportId}</span> },
              { key: 'product', header: 'Product', render: (r) => r.snapshot?.productName || '—' },
              { key: 'inspection', header: 'Inspection', render: (r) => (
                <Link to={`/inspections/${r.inspectionId?._id}`} className="font-mono text-xs hover:underline">{r.inspectionId?.inspectionId || '—'}</Link>
              ) },
              { key: 'finalStatus', header: 'Status', render: (r) => <Badge status={r.snapshot?.finalStatus} size="xs" /> },
              { key: 'generatedBy', header: 'By', render: (r) => r.generatedBy?.name || '—' },
              { key: 'createdAt', header: 'Date', render: (r) => fmtDateTime(r.createdAt) },
              {
                key: 'actions',
                header: '',
                className: 'text-right whitespace-nowrap',
                render: (r) => (
                  <span className="inline-flex gap-1.5">
                    <button
                      title="Download PDF"
                      className="rounded-lg bg-primary-50 p-1.5 text-primary-700 transition hover:bg-primary-100 dark:bg-slate-800 dark:text-primary-400"
                      onClick={async () => {
                        try {
                          const res = await api.get(`/reports/${r._id}/pdf`, { responseType: 'blob' });
                          const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${r.reportId || 'report'}.pdf`;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch { toast.error('Download failed'); }
                      }}
                    >
                      <Download size={14} />
                    </button>
                    <button onClick={() => setChecksumOf(r)} title="Verify checksum" className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400">
                      <ShieldCheck size={14} />
                    </button>
                    <button
                      title="Export JSON"
                      className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                      onClick={async () => {
                        try {
                          const res = await api.get(`/reports/${r._id}/export.json`, { responseType: 'blob' });
                          const url = URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${r.reportId || 'report'}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch { toast.error('Export failed'); }
                      }}
                    >
                      <Braces size={14} />
                    </button>
                  </span>
                ),
              },
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

      {/* Generate modal */}
      <Modal open={genOpen} onClose={() => setGenOpen(false)} title="Generate PDF report">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Enter the inspection reference (e.g. <code>LMC-INS-2026-00001</code>) to produce its official report.
            Reports are idempotent — one canonical report per inspection.
          </p>
          <Input label="Inspection reference or ID" value={inspectionRef} onChange={(e) => setInspectionRef(e.target.value)} placeholder="LMC-INS-…" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setGenOpen(false)}>Cancel</Button>
            <Button loading={generating} disabled={!inspectionRef.trim()} icon={FileText} onClick={generate}>
              Generate
            </Button>
          </div>
        </div>
      </Modal>

      {/* Checksum modal */}
      <Modal open={Boolean(checksumOf)} onClose={() => setChecksumOf(null)} title="Digital verification" size="sm">
        {checksumOf && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-500">
              SHA-256 content checksum printed inside the PDF must match the value below. Any alteration of the
              document breaks the match.
            </p>
            <code data-testid="checksum" className="block break-all rounded-lg bg-slate-100 p-3 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {checksumOf.checksumSha256}
            </code>
          </div>
        )}
      </Modal>
    </div>
  );
}
