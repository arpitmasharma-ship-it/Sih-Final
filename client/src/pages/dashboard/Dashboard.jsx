import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PackageSearch, ClipboardList, CheckCircle2, XCircle,
  AlertTriangle, ShieldAlert, TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import api from '../../services/api';
import StatCard from '../../components/ui/StatCard';
import Card, { CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Feedback';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth, usePageTitle } from '../../hooks';
import { fmtAgo } from '../../utils/format';

const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b'];
const SEV_COLORS = { CRITICAL: '#b91c1c', HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#94a3b8' };

export default function Dashboard() {
  const user = useAuth();
  usePageTitle('Dashboard');
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [violations, setViolations] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [s, t, v, r] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/trends?months=6'),
          api.get('/dashboard/violations'),
          api.get('/inspections?limit=6'),
        ]);
        if (!alive) return;
        setSummary(s.data.data);
        setTrends(t.data.data);
        setViolations(v.data.data);
        setRecent(Array.isArray(r.data.data) ? r.data.data : []);
      } catch {
        // surfaced via empty states
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const statusPie = summary
    ? [
        { name: 'Compliant', value: (summary.compliant || 0) },
        { name: 'Non-Compliant', value: (summary.nonCompliant || 0) },
        { name: 'Requires Review', value: (summary.requiresReview || 0) },
      ].filter((x) => x.value > 0)
    : [];

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0]}`}
        subtitle="Legal Metrology packaged-commodity compliance overview."
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatCard loading={loading} icon={PackageSearch} label="Products Scanned" value={summary?.totalProducts} tone="blue" />
        <StatCard loading={loading} icon={ClipboardList} label="Total Inspections" value={summary?.totalInspections} tone="slate" sub={summary ? `${summary.reportsGenerated} reports generated` : undefined} />
        <StatCard loading={loading} icon={CheckCircle2} label="Compliant" value={summary?.compliant} tone="green" sub={summary ? `${summary.compliancePercentage}% compliance rate` : undefined} />
        <StatCard loading={loading} icon={XCircle} label="Non-Compliant" value={summary?.nonCompliant} tone="red" />
        <StatCard loading={loading} icon={AlertTriangle} label="Requires Review" value={summary?.requiresReview} tone="amber" />
        <StatCard loading={loading} icon={ShieldAlert} label="High/Critical Violations" value={summary?.highSeverityViolations} tone="red" sub={summary ? `avg score ${summary.averageComplianceScore}%` : undefined} />
      </div>

      {/* Charts row */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle icon={TrendingUp}>Inspections & compliance trend</CardTitle>
          {loading ? (
            <SkeletonCard lines={4} />
          ) : trends.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">No inspection history yet — run your first scan.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trends} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gInsp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#356aa9" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#356aa9" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="inspections" name="Inspections" stroke="#26538a" fill="url(#gInsp)" strokeWidth={2} />
                <Area type="monotone" dataKey="complianceRate" name="Compliance %" stroke="#10b981" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle>Status split</CardTitle>
          {loading ? (
            <SkeletonCard lines={4} />
          ) : statusPie.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">No data yet</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
                    {statusPie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex justify-center gap-4 text-xs font-semibold">
                {statusPie.map((p, i) => (
                  <span key={p.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {p.name} ({p.value})
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Violations + recent inspections */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Violations by severity</CardTitle>
          {loading ? (
            <SkeletonCard lines={3} />
          ) : !violations?.bySeverity?.length ? (
            <p className="py-10 text-center text-sm text-slate-400">No violations recorded</p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={violations.bySeverity} layout="vertical" margin={{ left: 18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" horizontal={false} />
                <XAxis type="number" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" fontSize={11} width={72} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="value" name="Violations" radius={[0, 6, 6, 0]}>
                  {violations.bySeverity.map((entry) => (
                    <Cell key={entry.name} fill={SEV_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle>Recent inspections</CardTitle>
          {loading ? (
            <SkeletonCard lines={5} />
          ) : recent.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Nothing yet — scan a product to get started</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recent.map((r) => (
                <li key={r._id}>
                  <Link to={`/inspections/${r._id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">
                        {r.productId?.productName || 'Product'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {r.inspectionId} · {r.location?.district || '—'} · {fmtAgo(r.createdAt)}
                      </p>
                    </div>
                    <Badge status={r.finalStatus} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
