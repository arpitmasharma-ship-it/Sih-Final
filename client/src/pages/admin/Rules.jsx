import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { RefreshCw, Plus, History, Pencil, ShieldAlert, Scale } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { Spinner, EmptyState } from '../../components/ui/Feedback';
import { useAuth } from '../../hooks';
import { fmtDate, toastError } from '../../utils/format';

export default function Rules() {
  const role = useAuth()?.role;
  const isAdmin = role === 'ADMIN';
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState(null); // rule being edited
  const [historyOf, setHistoryOf] = useState(null); // rule whose history is shown
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/rules', { params: { q: q || undefined } });
      setRules(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (e) {
      toastError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const toggleEnabled = async (rule) => {
    try {
      await api.put(`/rules/${rule._id}`, { enabled: !rule.enabled });
      toast.success(`${rule.ruleCode} ${rule.enabled ? 'disabled' : 'enabled'}`);
      load();
    } catch (e) {
      toastError(e);
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      await api.post('/rules/sync');
      toast.success('Rules synced with official seed');
      load();
    } catch (e) {
      toastError(e);
    } finally {
      setSyncing(false);
    }
  };

  const openEdit = (rule) => {
    setForm({
      severity: rule.severity,
      enabled: rule.enabled,
      description: rule.description,
      sourceReference: rule.sourceReference,
      amendmentNote: rule.amendmentNote || '',
      changeSummary: '',
    });
    setEditing(rule);
  };

  const saveEdit = async () => {
    try {
      await api.put(`/rules/${editing._id}`, form);
      toast.success('Rule updated');
      setEditing(null);
      load();
    } catch (e) {
      toastError(e);
    }
  };

  return (
    <div>
      <PageHeader
        title="Compliance Rules"
        subtitle="Deterministic rules grounded in the Legal Metrology (Packaged Commodities) Rules, 2011."
        right={
          isAdmin && (
            <div className="flex gap-2">
              <Button icon={Plus} onClick={() => setCreating(true)}>New rule</Button>
              <Button variant="secondary" icon={RefreshCw} loading={syncing} onClick={sync}>
                Sync official seed
              </Button>
            </div>
          )
        }
      />

      <Card className="mb-4">
        <Input label="Search" placeholder="Rule code or keyword…" value={q} onChange={(e) => setQ(e.target.value)} />
      </Card>

      {loading ? (
        <Spinner />
      ) : rules.length === 0 ? (
        <EmptyState icon={Scale} title="No rules found" message="Sync the official seed to populate the rulebook." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rules.map((r) => (
            <Card key={r._id} data-testid={`rule-${r.ruleCode}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-mono text-xs font-bold text-primary-700 dark:text-primary-400">
                    {r.ruleCode}
                    {!r.enabled && <Badge status="REQUIRES_REVIEW" label="disabled" size="xs" />}
                    {r.advisory && <Badge status="REQUIRES_REVIEW" label="advisory" size="xs" />}
                  </p>
                  <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-100">{r.title}</p>
                </div>
                <Badge severity={r.severity} />
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{r.description}</p>
              <p className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] italic text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {r.sourceReference}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">v{r.version}</span>
                <span className="inline-flex gap-1.5">
                  {isAdmin ? (
                    <>
                      <Button size="xs" variant="secondary" icon={Pencil} onClick={() => openEdit(r)}>Edit</Button>
                      <Button size="xs" variant={r.enabled ? 'danger' : 'success'} onClick={() => toggleEnabled(r)}>
                        {r.enabled ? 'Disable' : 'Enable'}
                      </Button>
                    </>
                  ) : (
                    <Button size="xs" variant={r.enabled ? 'secondary' : 'danger'} disabled>
                      {r.enabled ? 'Active' : 'Inactive'}
                    </Button>
                  )}
                  <Button size="xs" variant="ghost" icon={History} onClick={() => setHistoryOf(r)}>
                    {r.history?.length || 0}
                  </Button>
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={`Edit ${editing?.ruleCode || ''}`}>
        {editing && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Severity</label>
                <select className="input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end pb-1.5">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="h-4 w-4 accent-primary-700" />
                  Enabled
                </label>
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea rows={3} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <Input label="Legal reference" value={form.sourceReference} onChange={(e) => setForm({ ...form, sourceReference: e.target.value })} />
            <Input label="Amendment note" value={form.amendmentNote} onChange={(e) => setForm({ ...form, amendmentNote: e.target.value })} />
            <Input label="Change summary *" placeholder="Why are you changing this rule?" value={form.changeSummary} onChange={(e) => setForm({ ...form, changeSummary: e.target.value })} />
            <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <ShieldAlert size={13} className="mt-0.5 shrink-0" /> Every edit is versioned in the rule history and audit log.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button disabled={!form.changeSummary.trim()} onClick={saveEdit}>Save changes</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* History modal */}
      <Modal open={Boolean(historyOf)} onClose={() => setHistoryOf(null)} title={`Version history — ${historyOf?.ruleCode || ''}`} size="lg">
        {historyOf && (
          <ol className="space-y-3">
            {[...(historyOf.history || [])].reverse().map((h) => (
              <li key={h.version} className="rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                <p className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                  v{h.version}
                  <span className="font-normal text-slate-400">{fmtDate(h.changedAt)}</span>
                </p>
                {h.changeSummary && <p className="mt-1 text-sm">{h.changeSummary}</p>}
              </li>
            ))}
            {(!historyOf.history || historyOf.history.length === 0) && (
              <p className="py-6 text-center text-sm text-slate-400">No recorded changes yet.</p>
            )}
          </ol>
        )}
      </Modal>

      {/* Create modal */}
      <CreateRuleModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          load();
        }}
      />
    </div>
  );
}

function CreateRuleModal({ open, onClose, onCreated }) {
  const [f, setF] = useState({
    ruleCode: '', title: '', description: '', category: 'OTHER',
    validationType: 'PRESENCE', requiredFieldsCsv: '', severity: 'MEDIUM',
    sourceReference: '', advisory: false, changeSummary: 'Initial creation',
  });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post('/rules', {
        ...f,
        requiredFields: f.requiredFieldsCsv.split(',').map((x) => x.trim()).filter(Boolean),
      });
      toast.success('Rule created');
      onCreated();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New compliance rule" size="lg">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Rule code *" placeholder="LM-PC-CUSTOM-001" value={f.ruleCode} onChange={(e) => setF({ ...f, ruleCode: e.target.value.toUpperCase() })} />
        <Input label="Title *" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <div className="sm:col-span-2">
          <label className="label">Description *</label>
          <textarea rows={2} className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {['MANDATORY_DECLARATION','NET_QUANTITY','MRP','MANUFACTURER_INFO','PACKER_INFO','IMPORTER_INFO','COUNTRY_OF_ORIGIN','CONSUMER_CARE','DATE_DECLARATIONS','UNIT_DECLARATIONS','READABILITY','FONT_SIZE','PLACEMENT','FORMATTING','MISLEADING_DECLARATIONS','OTHER'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Validation type</label>
          <select className="input" value={f.validationType} onChange={(e) => setF({ ...f, validationType: e.target.value })}>
            <option>PRESENCE</option>
            <option>PATTERN</option>
          </select>
        </div>
        <Input label="Required fields (comma-sep FIELD keys)" placeholder="MRP, INCLUSIVE_OF_ALL_TAXES" value={f.requiredFieldsCsv} onChange={(e) => setF({ ...f, requiredFieldsCsv: e.target.value })} />
        <div>
          <label className="label">Severity</label>
          <select className="input" value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value })}>
            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Input label="Legal reference *" placeholder="Rule 6(1)(a), LMPC Rules 2011" value={f.sourceReference} onChange={(e) => setF({ ...f, sourceReference: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 sm:col-span-2 dark:text-slate-300">
          <input type="checkbox" checked={f.advisory} onChange={(e) => setF({ ...f, advisory: e.target.checked })} className="h-4 w-4 accent-primary-700" />
          Advisory only (warnings never flip the final verdict)
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={busy} onClick={submit}>Create rule</Button>
      </div>
    </Modal>
  );
}
