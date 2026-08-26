import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  ArrowLeft, FileText, MapPin, User, CheckCircle2, XCircle,
  Eye, ClipboardCheck,
} from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal, { ConfirmDialog } from '../../components/ui/Modal';
import CompliancePanel from '../../components/scanner/CompliancePanel';
import BboxViewer from '../../components/scanner/BboxViewer';
import FieldEditorList from '../../components/scanner/FieldEditorList';
import { Spinner, EmptyState } from '../../components/ui/Feedback';
import { fmtDateTime, toastError } from '../../utils/format';

export default function InspectionDetails({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const role = useSelector((s) => s.auth.user?.role);
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [decision, setDecision] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const load = async () => {
    try {
      const res = await api.get(`/inspections/${id}`);
      setInspection(res.data.data);
    } catch (e) {
      setError(e.friendlyMessage || 'Failed to load inspection');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <EmptyState title="Cannot load inspection" message={error} />;
  if (!inspection) return null;

  const canReview = ['ADMIN', 'INSPECTOR'].includes(role);

  const generateReport = async () => {
    setGenerating(true);
    try {
      await api.post('/reports', { inspectionId: inspection._id });
      toast.success('Report ready');
      await load();
    } catch (e) {
      toastError(e);
    } finally {
      setGenerating(false);
    }
  };

  const submitReview = async () => {
    setSubmittingReview(true);
    try {
      await api.put(`/inspections/${id}/review`, { decision, remarks });
      toast.success('Review recorded');
      setReviewOpen(false);
      setDecision('');
      setRemarks('');
      await load();
    } catch (e) {
      toastError(e);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div>
      <Link to="/inspections" className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-primary-700 dark:hover:text-primary-400">
        <ArrowLeft size={13} /> All inspections
      </Link>
      <PageHeader
        title={inspection.inspectionId}
        subtitle={`${inspection.productId?.productName || 'Product'} · ${fmtDateTime(inspection.createdAt)}${inspection.inspectorId ? ` · by ${inspection.inspectorId.name}` : ''}`}
        right={
          <div className="flex items-center gap-2">
            <Badge status={inspection.finalStatus} />
            {!inspection.reportId && (
              <Button size="sm" variant="secondary" icon={FileText} loading={generating} onClick={generateReport}>
                Generate report
              </Button>
            )}
            {inspection.reportId && (
              <Link to="/reports">
                <Button size="sm" variant="secondary" icon={Eye}>View report</Button>
              </Link>
            )}
            {canReview && !inspection.reviewed && (
              <Button size="sm" icon={ClipboardCheck} onClick={() => setReviewOpen(true)}>
                Review
              </Button>
            )}
          </div>
        }
      />

      {/* Review banner */}
      {inspection.reviewed && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${['PASS_AFTER_REVIEW', 'COMPLIANT'].includes(inspection.finalStatus) ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'}`}>
          Reviewed by <strong>{inspection.reviewedBy?.name || 'officer'}</strong> on {fmtDateTime(inspection.reviewedAt)}
          {inspection.reviewRemarks && <> — “{inspection.reviewRemarks}”</>}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <CompliancePanel
            result={{
              status: inspection.finalStatus,
              scores: inspection.scores || {},
              summary: inspection.summary || {},
              checks: inspection.complianceChecks || [],
              violations: inspection.violations || [],
              warnings: inspection.warnings || [],
              engineVersion: inspection.engineVersion,
            }}
          />

          <Card>
            <CardTitle>Declarations snapshot</CardTitle>
            <FieldEditorList declarations={inspection.declarations || {}} onChange={() => {}} />
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardTitle icon={MapPin}>Location & notes</CardTitle>
            <dl className="space-y-1.5 text-xs">
              <Row k="State" v={inspection.location?.state} />
              <Row k="District" v={inspection.location?.district} />
              <Row k="Place" v={inspection.location?.addressLabel} />
              <Row k="Inspector" v={inspection.inspectorId?.name} />
            </dl>
            {inspection.inspectorNotes && (
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs italic text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                “{inspection.inspectorNotes}”
              </p>
            )}
          </Card>

          <Card>
            <CardTitle>Evidence ({inspection.images?.length || 0})</CardTitle>
            <div className="space-y-3">
              {(inspection.images || []).map((img, i) => (
                <BboxViewer key={img.url || i} url={img.url} alt={img.label || `IMAGE ${i + 1}`} fields={[]} imageIndex={i} />
              ))}
              {(!inspection.images || inspection.images.length === 0) && (
                <p className="text-sm text-slate-400">No images attached.</p>
              )}
            </div>
          </Card>

          {inspection.humanCorrections?.length > 0 && (
            <Card>
              <CardTitle icon={User}>Human corrections ({inspection.humanCorrections.length})</CardTitle>
              <ul className="list-inside list-disc text-xs text-slate-500 dark:text-slate-400">
                {inspection.humanCorrections.map((c) => (
                  <li key={c.field}><span className="font-mono">{c.field}</span></li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {/* Review modal */}
      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title="Finalise review">
        <div className="space-y-4">
          <div>
            <label className="label">Decision</label>
            <select data-testid="review-decision" className="input" value={decision} onChange={(e) => setDecision(e.target.value)}>
              <option value="">Select…</option>
              <option value="PASS_AFTER_REVIEW">Pass after review (dismiss violations)</option>
              <option value="VIOLATION_CONFIRMED">Violation confirmed</option>
              <option value="COMPLIANT">Compliant</option>
              <option value="NON_COMPLIANT">Non-compliant</option>
              <option value="REQUIRES_REVIEW">Keep in review</option>
            </select>
          </div>
          <div>
            <label className="label">Remarks</label>
            <textarea rows={3} className="input" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Rationale for the record…" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button
              disabled={!decision}
              loading={submittingReview}
              icon={decision === 'VIOLATION_CONFIRMED' ? XCircle : CheckCircle2}
              onClick={() =>
                setConfirm({
                  title: 'Confirm decision',
                  body: (
                    decision === 'PASS_AFTER_REVIEW'
                      ? 'All violations on this inspection will be marked DISMISSED and the product will be marked compliant.'
                      : decision === 'VIOLATION_CONFIRMED'
                        ? 'All violations will be marked CONFIRMED and the product non-compliant.'
                        : ''
                  ),
                  onYes: submitReview,
                })
              }
            >
              Submit review
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.body}
        confirmLabel="Yes, proceed"
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm?.onYes?.()}
      />
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed border-slate-100 pb-1 dark:border-slate-800">
      <dt className="text-slate-400">{k}</dt>
      <dd className="text-right font-bold text-slate-600 dark:text-slate-300">{v || '—'}</dd>
    </div>
  );
}
