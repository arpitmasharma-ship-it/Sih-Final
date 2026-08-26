import { useState } from 'react';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import { Save } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardTitle } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { updateMe } from '../../redux/slices/authSlice';
import { STATES } from '../../constants';

export default function Profile() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    department: user?.department || '',
    state: user?.state || '',
    district: user?.district || '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await dispatch(updateMe(form)).unwrap();
      toast.success('Profile updated');
    } catch (e) {
      toast.error(e || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Profile" subtitle="Your account details and posting information." />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardTitle>Account</CardTitle>
          <dl className="space-y-1.5 text-xs">
            {[
              ['E-mail', user?.email],
              ['Role', user?.role],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-dashed border-slate-100 pb-1 dark:border-slate-800">
                <dt className="text-slate-400">{k}</dt>
                <dd className="font-bold text-slate-600 dark:text-slate-300">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <CardTitle>Edit details</CardTitle>
          <div className="space-y-3">
            <Input label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91…" />
            <Input label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Legal Metrology Dept." />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">State</label>
                <select className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
                  <option value="">— Select —</option>
                  {STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <Input label="District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
            </div>
            <Button icon={Save} loading={saving} onClick={save}>Save changes</Button>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle>Password</CardTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Password changes are performed by administrators for security compliance. Contact your department admin
          to reset your password.
        </p>
      </Card>
    </div>
  );
}
