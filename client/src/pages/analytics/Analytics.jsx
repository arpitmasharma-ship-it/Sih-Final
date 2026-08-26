import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts';
import { MapPinned, Users, ServerCog, TrendingUp, FileText, ClipboardList } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardTitle } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import { SkeletonCard } from '../../components/ui/Feedback';
import { useAuth } from '../../hooks';

const SEV_COLORS = { CRITICAL: '#b91c1c', HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#94a3b8' };

export default function Analytics() {
  const user = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [districts, setDistricts] = useState(null);
  const [trends, setTrends] = useState([]);
  const [violations, setViolations] = useState(null);
  const [inspectors, setInspectors] = useState([]);
  const [system, setSystem] = useState(null);
  const [months, setMonths] = useState(12);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [d, t, v] = await Promise.all([
          api.get('/dashboard/districts'),
          api.get(`/dashboard/trends?months=${months}`),
          api.get('/dashboard/violations'),
        ]);
        setDistricts(d.data.data);
        setTrends(t.data.data || []);
        setViolations(v.data.data);
        if (isAdmin) {
          try {
            const [insp, sys] = await Promise.all([
              api.get('/dashboard/inspectors'),
              api.get('/dashboard/system'),
            ]);
            setInspectors(insp.data.data || []);
            setSystem(sys.data.data);
          } catch {
            /* admin-only extras optional */
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [months, isAdmin]);

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="District heat-readiness insights, trends and enforcement performance."
        right={
          <div className="flex items-end gap-2">
            <div>
              <label className="label">Window</label>
              <select className="input" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
                {[6, 12, 24].map((m) => (
                  <option key={m} value={m}>{m} months</option>
                ))}
              </select>
            </div>
          </div>
        }
      />

      {/* Violation severity split */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle icon={TrendingUp}>Inspection trend ({months} months)</CardTitle>
          {loading ? (
            <SkeletonCard lines={4} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trends} margin={{ top: 5, right: 10, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="inspections" name="Inspections" stroke="#26538a" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="violations" name="Violations" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="complianceRate" name="Compliance %" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle>Violations by severity</CardTitle>
          {loading ? (
            <SkeletonCard lines={4} />
          ) : !violations?.bySeverity?.length ? (
            <p className="py-16 text-center text-sm text-slate-400">No violations recorded</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={violations.bySeverity} dataKey="value" nameKey="name" outerRadius={85} innerRadius={50} paddingAngle={3}>
                    {violations.bySeverity.map((e) => (
                      <Cell key={e.name} fill={SEV_COLORS[e.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 text-xs font-semibold">
                {violations.bySeverity.map((e) => (
                  <span key={e.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: SEV_COLORS[e.name] }} />
                    {e.name} ({e.value})
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* District table */}
      <Card className="mt-5">
        <CardTitle icon={MapPinned}>District breakdown</CardTitle>
        {loading ? (
          <SkeletonCard lines={6} />
        ) : !districts?.rows?.length ? (
          <p className="py-10 text-center text-sm text-slate-400">No district data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="table-head text-left">
                  <th className="px-3 py-2.5 font-bold">District</th>
                  <th className="px-3 py-2.5 font-bold">State</th>
                  <th className="px-3 py-2.5 text-right font-bold">Inspections</th>
                  <th className="px-3 py-2.5 text-right font-bold">Violations</th>
                  <th className="px-3 py-2.5 text-right font-bold">Avg score</th>
                  <th className="px-3 py-2.5 font-bold">Risk</th>
                </tr>
              </thead>
              <tbody>
                {districts.rows.map((r) => {
                  const rate = r.violationRate ?? 0;
                  return (
                    <tr key={r.district || '—'} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2.5 font-semibold">{r.district || 'Unknown'}</td>
                      <td className="px-3 py-2.5 text-slate-500">{r.state || '—'}</td>
                      <td className="px-3 py-2.5 text-right">{r.inspections}</td>
                      <td className="px-3 py-2.5 text-right">{r.violations}</td>
                      <td className="px-3 py-2.5 text-right">{r.avgScore ?? '—'}%</td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          rate >= 60 ? 'bg-red-700 text-white' : rate >= 30 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : rate > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        }`}>
                          {rate >= 60 ? 'CRITICAL' : rate >= 30 ? 'HIGH' : rate > 0 ? 'MODERATE' : 'LOW'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Admin extras */}
      {isAdmin && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardTitle icon={Users}>Inspector leaderboard</CardTitle>
            {loading ? (
              <SkeletonCard lines={5} />
            ) : inspectors.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No inspector activity yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, inspectors.length * 42)}>
                <BarChart data={inspectors} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" horizontal={false} />
                  <XAxis type="number" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" fontSize={11} width={110} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="inspections" name="Inspections" radius={[0, 6, 6, 0]} fill="#356aa9" barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <StatCard loading={loading} icon={Users} label="Registered users" value={system?.users ?? '—'} tone="slate" />
              <StatCard loading={loading} icon={ServerCog} label="Products" value={system?.products ?? '—'} tone="blue" />
              <StatCard loading={loading} icon={ClipboardList} label="Inspections" value={system?.inspections ?? '—'} tone="green" />
              <StatCard loading={loading} icon={FileText} label="Reports" value={system?.reports ?? '—'} tone="amber" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
