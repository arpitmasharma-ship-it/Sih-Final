import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  UploadCloud, Cpu, Save, ChevronLeft, ChevronRight,
  MapPin, FileText, Loader2,
} from 'lucide-react';
import api, { SERVER_URL } from '../../services/api';
import Card, { CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import PageHeader from '../../components/ui/PageHeader';
import { Dropzone } from '../../components/scanner/Dropzone';
import FieldEditorList from '../../components/scanner/FieldEditorList';
import CompliancePanel from '../../components/scanner/CompliancePanel';
import DemoModeBar from '../../components/scanner/DemoModeBar';
import BboxViewer from '../../components/scanner/BboxViewer';
import { CATEGORIES, STATES } from '../../constants';

const STEPS = [
  { key: 'UPLOAD', label: 'Upload', icon: UploadCloud },
  { key: 'REVIEW', label: 'Extract & review', icon: Cpu },
  { key: 'SAVE', label: 'Save inspection', icon: Save },
];

export default function Scanner() {
  const navigate = useNavigate();
  const [stepIdx, setStepIdx] = useState(0);
  const [images, setImages] = useState([]);
  const [variant, setVariant] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ocrProvider, setOcrProvider] = useState(null);

  // OCR results
  const [uploadedImages, setUploadedImages] = useState([]); // server-stored copies {url, publicId, label}
  const [ocrPerImage, setOcrPerImage] = useState([]);
  const [ocrMeta, setOcrMeta] = useState(null);
  const [declarations, setDeclarations] = useState({});
  const [compliance, setCompliance] = useState(null);
  const [humanCorrections, setHumanCorrections] = useState([]);

  // Inspection metadata
  const [meta, setMeta] = useState({
    productName: '',
    brandName: '',
    category: 'OTHER',
    state: '',
    district: '',
    addressLabel: '',
    inspectorNotes: '',
  });

  // Detect OCR provider on mount
  useEffect(() => {
    fetch(`${SERVER_URL}/health`)
      .then((r) => r.json())
      .then((d) => setOcrProvider(d.ocrProvider))
      .catch(() => setOcrProvider('demo'));
  }, []);

  const step = STEPS[stepIdx].key;

  const runOcr = async () => {
    if (images.length === 0) return;
    setProcessing(true);
    try {
      const fd = new FormData();
      images.forEach((img) => fd.append('images', img.file));
      fd.append('labels', JSON.stringify(images.map((i) => i.label)));
      if (variant) fd.append('variant', variant);

      // Submit as an async job; poll until it completes so the UI is responsive
      // while OCR + image upload run in the background. Retry the submit on
      // transient network errors (e.g. Render free tier waking from sleep).
      let res;
      const BACKOFF = [3000, 8000, 15000, 25000, 40000];
      for (let t = 0; t < BACKOFF.length + 1; t++) {
        try {
          res = await api.post('/scan/ocr', fd);
          break;
        } catch (err) {
          // Retry on transient gateway errors too: Render free dynos sleep after
          // idle and the first request that wakes them often returns 502/503.
          const transient =
            err?.code === 'ERR_NETWORK' ||
            err?.code === 'ECONNABORTED' ||
            err?.code === 'ERR_BLOCKED_BY_CLIENT' ||
            err?.response?.status === 502 ||
            err?.response?.status === 503;
          if (!transient) throw err;
          if (t >= BACKOFF.length) throw err;
          await new Promise((r) => setTimeout(r, BACKOFF[t]));
        }
      }
      const jobId = res?.data?.data?.jobId;
      if (!jobId) throw new Error('No job id returned from server');

      let d = null;
      let silentNetworkFails = 0;
      for (let attempt = 0; attempt < 600; attempt++) {
        // Gentle, non-aggressive polling (helps avoid privacy extensions and
        // rate-limiters treating rapid same-host GETs as bot traffic).
        await new Promise((r) => setTimeout(r, 1200 + Math.min(attempt, 12) * 200));
        let job;
        try {
          const statusRes = await api.get(`/scan/ocr/${jobId}`);
          job = statusRes.data?.data;
          silentNetworkFails = 0;
        } catch (err) {
          // 401/403 (expired session, forbidden) will not heal by retrying.
          if (err?.response?.status === 401 || err?.response?.status === 403) throw err;
          // Transient network errors (backend sleeping on Render free tier after
          // idle, or a redeploy in progress) should be retried, not fatal.
          if (silentNetworkFails++ > 25) throw err;
          continue;
        }
        if (job?.status === 'completed') {
          d = job.data;
          break;
        }
        if (job?.status === 'failed') {
          throw new Error(job.message || 'OCR processing failed');
        }
      }
      if (!d) throw new Error('OCR job timed out');

      setUploadedImages(d.images || []);
      setOcrPerImage(d.ocrPerImage || []);
      setOcrMeta(d.ocrMeta || null);
      setDeclarations(d.declarations || {});
      setCompliance(null);
      setStepIdx(1);

      // Auto-fill product name from OCR if available
      if (d.declarations?.PRODUCT_NAME?.value && !meta.productName) {
        setMeta((prev) => ({ ...prev, productName: d.declarations.PRODUCT_NAME.value }));
      }
    } catch (e) {
      toast.error(e.friendlyMessage || 'OCR processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const evaluate = async () => {
    setProcessing(true);
    try {
      const res = await api.post('/compliance/check', { declarations, ocrMeta });
      setCompliance(res.data.data);
    } catch (e) {
      toast.error(e.friendlyMessage || 'Evaluation failed');
    } finally {
      setProcessing(false);
    }
  };

  const saveInspection = async () => {
    if (!meta.productName.trim()) {
      toast.error('Product name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        productName: meta.productName.trim(),
        brandName: meta.brandName?.trim() || undefined,
        category: meta.category,
        images: uploadedImages.map((img, i) => ({
          url: img.url,
          publicId: img.publicId || undefined,
          label: img.label,
          provider: ocrPerImage[i]?.ocr?.provider || (ocrMeta?.providers?.[0] ?? 'unknown'),
        })),
        declarations,
        humanCorrections,
        location: {
          state: meta.state || undefined,
          district: meta.district || undefined,
          addressLabel: meta.addressLabel || undefined,
        },
        inspectorNotes: meta.inspectorNotes || undefined,
        ocrResultIds: ocrPerImage.map((o) => o.ocrResultId).filter(Boolean),
      };
      const res = await api.post('/inspections', payload);
      const newInspectionId = res.data.data?.inspectionId;
      if (newInspectionId) {
        try {
          await api.post('/reports', { inspectionId: newInspectionId });
        } catch {}
      }
      toast.success(`Inspection saved — ${res.data.data?.inspectionRef}`);
      navigate(`/inspections/${newInspectionId || ''}`);
    } catch (e) {
      toast.error(e.friendlyMessage || 'Could not save inspection');
    } finally {
      setSaving(false);
    }
  };

  /* Track human edits for the audit trail */
  const onDeclarationsChange = (next) => {
    Object.keys(next).forEach((k) => {
      if ((declarations[k]?.value ?? '') !== (next[k]?.value ?? '') && next[k]?.humanVerified) {
        setHumanCorrections((prev) => [...prev.filter((c) => c.field !== k), { field: k, value: next[k].value }]);
      }
    });
    setDeclarations(next);
  };

  return (
    <div>
      <PageHeader title="New Scan" subtitle="Upload package photos, verify OCR extraction, and record a compliance inspection." />

      {/* Stepper */}
      <ol className="mb-5 flex items-center gap-1 overflow-x-auto pb-1 text-xs font-bold sm:text-sm">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex items-center gap-1">
            <button
              onClick={() => i < stepIdx && setStepIdx(i)}
              disabled={i > stepIdx}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 transition ${
                i === stepIdx
                  ? 'bg-primary-800 text-white'
                  : i < stepIdx
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200'
                    : 'text-slate-400'
              }`}
            >
              <s.icon size={14} /> {s.label}
            </button>
            {i < STEPS.length - 1 && <ChevronRight size={13} className="text-slate-300" />}
          </li>
        ))}
      </ol>

      {step === 'UPLOAD' && (
        <div className="space-y-4">
          {ocrProvider === 'demo' && (
            <DemoModeBar
              busy={processing}
              variant={variant}
              onChange={(v) => setVariant((cur) => (cur === v ? null : v))}
            />
          )}
          <Card>
            <CardTitle icon={UploadCloud}>Package photos</CardTitle>
            <Dropzone images={images} setImages={setImages} disabled={processing} />
            <div className="mt-5 flex justify-end">
              <Button
                data-testid="run-ocr"
                onClick={runOcr}
                loading={processing}
                disabled={images.length === 0}
                icon={processing ? Loader2 : Cpu}
              >
                {processing ? 'Extracting…' : `Run OCR (${images.length} image${images.length === 1 ? '' : 's'})`}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {step === 'REVIEW' && (
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Left: extracted fields + metadata */}
          <div className="space-y-4 lg:col-span-3">
            <Card>
              <CardTitle>Verify extracted declarations</CardTitle>
              <FieldEditorList declarations={declarations} onChange={onDeclarationsChange} />
              <div className="mt-6 flex flex-wrap gap-2">
                <Button onClick={evaluate} loading={processing} icon={Cpu}>
                  {compliance ? 'Re-evaluate rules' : 'Evaluate compliance'}
                </Button>
                <Button
                  variant="secondary"
                  icon={ChevronLeft}
                  onClick={() => setStepIdx(0)}
                >
                  Back to images
                </Button>
              </div>
            </Card>

            <Card>
              <CardTitle icon={MapPin}>Product & location details</CardTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Product name *"
                  value={meta.productName}
                  onChange={(e) => setMeta({ ...meta, productName: e.target.value })}
                  placeholder="e.g. Britannia Good Day Cashew 600g"
                />
                <Input
                  label="Brand"
                  value={meta.brandName}
                  onChange={(e) => setMeta({ ...meta, brandName: e.target.value })}
                />
                <div>
                  <label className="label">Category</label>
                  <select
                    className="input"
                    value={meta.category}
                    onChange={(e) => setMeta({ ...meta, category: e.target.value })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">State</label>
                  <select
                    className="input"
                    value={meta.state}
                    onChange={(e) => setMeta({ ...meta, state: e.target.value })}
                  >
                    <option value="">— Select —</option>
                    {STATES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="District"
                  value={meta.district}
                  onChange={(e) => setMeta({ ...meta, district: e.target.value })}
                />
                <Input
                  label="Location label"
                  placeholder="e.g. Supermarket, MG Road"
                  value={meta.addressLabel}
                  onChange={(e) => setMeta({ ...meta, addressLabel: e.target.value })}
                />
              </div>
              <div className="mt-3">
                <label className="label flex items-center gap-1.5">
                  <FileText size={12} /> Inspector notes
                </label>
                <textarea
                  rows={3}
                  className="input"
                  value={meta.inspectorNotes}
                  onChange={(e) => setMeta({ ...meta, inspectorNotes: e.target.value })}
                  placeholder="Observations at the point of inspection…"
                />
              </div>
            </Card>
          </div>

          {/* Right: evidence + verdict */}
          <div className="space-y-4 lg:col-span-2">
            {compliance ? (
              <CompliancePanel result={compliance} />
            ) : (
              <Card className="text-sm text-slate-400">
                Evaluate compliance to see the rule-by-rule verdict here.
              </Card>
            )}

            {ocrPerImage.length > 0 && (
              <Card>
                <CardTitle>Evidence ({ocrPerImage.length})</CardTitle>
                {ocrMeta?.simulated && (
                  <p className="mb-3 rounded-lg bg-violet-50 px-3 py-2 text-[11px] font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                    Simulated OCR output — replace OCR_PROVIDER with a real engine for production use.
                  </p>
                )}
                <div className="space-y-3">
                  {ocrPerImage.map((o, i) => (
                    <BboxViewer
                      key={o.ocrResultId || i}
                      url={uploadedImages[i]?.url || images[i]?.previewUrl}
                      alt={images[i]?.label || `IMAGE ${i + 1}`}
                      fields={o.fields || []}
                      imageIndex={i}
                    />
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {step === 'SAVE' && (
        <Card className="max-w-xl mx-auto text-center py-10">
          <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Ready to record</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            The inspection snapshot, OCR evidence and rule evaluation will be stored immutably.
            You can then generate an official PDF report.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="secondary" icon={ChevronLeft} onClick={() => setStepIdx(1)}>
              Back to review
            </Button>
            <Button onClick={saveInspection} loading={saving} icon={Save}>
              Save inspection
            </Button>
          </div>
        </Card>
      )}

      {/* Step navigation footer for REVIEW -> SAVE */}
      {step === 'REVIEW' && compliance && (
        <div className="mt-4 flex justify-end">
          <Button icon={ChevronRight} onClick={() => setStepIdx(2)}>
            Continue to save
          </Button>
        </div>
      )}
    </div>
  );
}
