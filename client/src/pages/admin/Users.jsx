import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { UserPlus, KeyRound } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import DataTable, { Pagination } from '../../components/ui/DataTable';
import { TableSkeleton } from '../../components/ui/Feedback';
import { useDebounce } from '../../hooks';
import { fmtDate, toastError } from '../../utils/format';

const ROLES = ['INSPECTOR', 'ANALYST'];
const ROLE_CLS = {
  ADMIN: 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300',
  INSPECTOR: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  ANALYST: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export default function Users() {
  const [data, setData] = useState({ items: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounce(q);

  // create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'INSPECTOR', state: '', district: '' });
  const [creating, setCreating] = useState(false);

  // reset pw modal
  const [resetUser, setResetUser] = useState(null);
  const [newPw, setNewPw] = useState('');
  const [resetting, setResetting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users', {
        params: { q: debouncedQ || undefined, role: roleFilter || undefined, page, limit: 12 },
      });
      setData({ items: Array.isArray(res.data.data) ? res.data.data : [], pagination: res.data.pagination || null });
    } catch {
      setData({ items: [], pagination: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, roleFilter, page]);

  const toggleActive = async (u) => {
    try {
      await api.put(`/users/${u._id}`, { isActive: !u.isActive });
      toast.success(`${u.name} ${u.isActive ? 'deactivated' : 'activated'}`);
      load();
    } catch (e) {
      toastError(e);
    }
  };

  const createUser = async () => {
    setCreating(true);
    try {
      await api.post('/users', { ...form, state: form.state || undefined, district: form.district || undefined });
      toast.success('User created');
      setCreateOpen(false);
      setForm({ name: '', email: '', password: '', role: 'INSPECTOR', state: '', district: '' });      load();
    } catch (e) {
      toastError(e);
    } finally {
      setCreating(false);
    }
  };

  const resetPassword = async () => {
    setResetting(true);
    try {
      await api.put(`/users/${resetUser._id}/reset-password`, { newPassword: newPw });
      toast.success('Password reset');
      setResetUser(null);
      setNewPw('');
    } catch (e) {
      toastError(e);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Officers, inspectors and analyst accounts."
        right={
          <Button icon={UserPlus} onClick={() => setCreateOpen(true)}>
            Add user
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input label="Search" placeholder="Name or e-mail…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="sm:w-44">
            <label className="label">Role</label>
            <select className="input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All roles</option>
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (
        <>
          <DataTable
            rows={data.items}
            emptyMessage="No users found"
            columns={[
              { key: 'name', header: 'Name', render: (u) => (
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-200">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
              ) },
              { key: 'role', header: 'Role', render: (u) => (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_CLS[u.role] || ''}`}>{u.role}</span>
              ) },
              { key: 'district', header: 'District', render: (u) => u.district || '—' },
              { key: 'createdAt', header: 'Joined', render: (u) => fmtDate(u.createdAt) },
              { key: 'isActive', header: 'Status', render: (u) => (
                <Badge status={u.isActive ? 'COMPLIANT' : 'NON_COMPLIANT'} label={u.isActive ? 'active' : 'inactive'} size="xs" />
              ) },
              { key: 'actions', header: '', className: 'text-right whitespace-nowrap', render: (u) => (
                <span className="inline-flex gap-1.5">
                  <button
                    title="Reset password"
                    onClick={() => setResetUser(u)}
                    className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                  >
                    <KeyRound size={14} />
                  </button>
                  <Button size="xs" variant={u.isActive ? 'danger' : 'secondary'} onClick={() => toggleActive(u)}>
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </span>
              ) },
            ]}
          />
          {data.pagination && (
            <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={(p) => p && setPage(p)} />
          )}
        </>
      )}

      {/* Create user */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create user">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Full name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="E-mail *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Temp password * (min 8)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <div>
            <label className="label">Role *</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          <Input label="District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button loading={creating} disabled={!form.name || !form.email || form.password.length < 8} onClick={createUser}>
            Create user
          </Button>
        </div>
      </Modal>

      {/* Reset password */}
      <Modal open={Boolean(resetUser)} onClose={() => setResetUser(null)} title={`Reset password — ${resetUser?.name || ''}`} size="sm">
        <Input label="New password (min 8 chars)" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setResetUser(null)}>Cancel</Button>
          <Button loading={resetting} disabled={newPw.length < 8} onClick={resetPassword}>
            Reset
          </Button>
        </div>
      </Modal>
    </div>
  );
}
