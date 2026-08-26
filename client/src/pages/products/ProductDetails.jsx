import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import { Spinner, EmptyState } from '../../components/ui/Feedback';
import BboxViewer from '../../components/scanner/BboxViewer';
import { FIELD_GROUPS, FIELD_LABEL } from '../../constants';
import { fmtDateTime } from '../../utils/format';

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [pRes, iRes] = await Promise.all([
          api.get(`/products/${id}`),
          api.get(`/inspections`, { params: { productId: id, limit: 20 } }),
        ]);
        setProduct(pRes.data.data?.product || pRes.data.data);
        setInspections(Array.isArray(iRes.data.data) ? iRes.data.data : []);
      } catch (e) {
        setError(e.friendlyMessage || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <EmptyState title="Cannot load product" message={error} />;
  if (!product) return null;

  const decl = product.extractedDeclarations || {};

  return (
    <div>
      <Link to="/products" className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-primary-700 dark:hover:text-primary-400">
        <ArrowLeft size={13} /> All products
      </Link>
      <PageHeader
        title={product.productName}
        subtitle={[product.brandName, product.category, product.barcode && `EAN ${product.barcode}`].filter(Boolean).join(' · ')}
        right={<Badge status={product.complianceStatus} />}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {/* Declarations */}
          <Card>
            <CardTitle>Latest declarations</CardTitle>
            <div className="space-y-4">
              {FIELD_GROUPS.map((g) => {
                const entries = g.fields.filter((f) => decl[f.key]?.value);
                if (entries.length === 0) return null;
                return (
                  <div key={g.group}>
                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{g.group}</p>
                    <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                      {entries.map((f) => (
                        <div key={f.key} className="flex items-baseline justify-between gap-3 border-b border-dashed border-slate-100 pb-1 dark:border-slate-800">
                          <dt className="text-xs text-slate-400">{FIELD_LABEL[f.key]}</dt>
                          <dd className="text-right text-xs font-bold text-slate-700 dark:text-slate-200">
                            {decl[f.key].value}
                            {decl[f.key].humanVerified ? (
                              <span className="ml-1 rounded bg-emerald-100 px-1 text-[9px] font-bold uppercase text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">verified</span>
                            ) : (
                              <span className="ml-1 text-[9px] font-semibold text-slate-400">OCR</span>
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              })}
              {Object.keys(decl).length === 0 && <p className="text-sm text-slate-400">No declarations recorded.</p>}
            </div>
          </Card>

          {/* Inspection history */}
          <Card>
            <CardTitle>Inspection history ({inspections.length})</CardTitle>
            <DataTable
              rows={inspections}
              rowLink={(r) => `/inspections/${r._id}`}
              emptyMessage="No inspections yet"
              columns={[
                { key: 'inspectionId', header: 'Ref', render: (r) => <span className="font-mono text-xs font-semibold">{r.inspectionId}</span> },
                { key: 'createdAt', header: 'Date', render: (r) => fmtDateTime(r.createdAt) },
                { key: 'scores.overall', header: 'Score', render: (r) => `${r.scores?.overall ?? '—'}%` },
                { key: 'finalStatus', header: 'Status', render: (r) => <Badge status={r.finalStatus} size="xs" /> },
                {
                  key: 'report',
                  header: '',
                  render: (r) =>
                    r.reportId ? (
                      <Link to="/reports" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline dark:text-primary-400">
                        <FileText size={12} /> Report
                      </Link>
                    ) : null,
                },
              ]}
            />
          </Card>
        </div>

        {/* Evidence images */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardTitle>Evidence images ({product.images?.length || 0})</CardTitle>
            {product.images?.length > 0 ? (
              <div className="space-y-3">
                {product.images.map((img, i) => (
                  <BboxViewer
                    key={i}
                    url={img.url}
                    alt={img.label || `IMAGE ${i + 1}`}
                    fields={[]}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No images stored for this product.</p>
            )}
          </Card>

          <Card>
            <CardTitle>Meta</CardTitle>
            <dl className="space-y-1.5 text-xs">
              {[
                ['Compliance score', `${product.complianceScore ?? '—'}%`],
                ['Created', fmtDateTime(product.createdAt)],
                ['Updated', fmtDateTime(product.updatedAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-slate-400">{k}</dt>
                  <dd className="font-semibold text-slate-600 dark:text-slate-300">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
