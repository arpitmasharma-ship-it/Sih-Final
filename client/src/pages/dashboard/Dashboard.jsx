import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PackageSearch, ClipboardList, CheckCircle2, XCircle,
  AlertTriangle, ShieldAlert, TrendingUp, Scan,
  BarChart3, ShieldCheck, Activity, ChevronRight,
  FileText, Scale, Eye
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import api from '../../services/api';
import StatCard, { ScoreRing } from '../../components/ui/StatCard';
import Card, { CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Feedback';
import { useAuth, usePageTitle } from '../../hooks';
import { fmtAgo } from '../../utils/format';

const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b'];
const SEV_COLORS = { CRITICAL: '#dc2626', HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#94a3b8' };

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
    <div className="space-y-6">
      {/* Officer Welcome & Action Bar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Enforcement Overview · Welcome, {user?.name}
            </h1>
            <span className="rounded-md bg-primary-50 dark:bg-primary-950/80 px-2 py-0.5 text-xs font-bold text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
              {user?.role}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Legal Metrology (Packaged Commodities) Rules, 2011 · Department of Consumer Affairs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/scanner"
            className="flex items-center gap-2 rounded-lg bg-primary-800 hover:bg-primary-900 dark:bg-primary-700 dark:hover:bg-primary-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition active:scale-98"
          >
            <Scan size={15} />
            <span>New Package Scan</span>
          </Link>
          <Link
            to="/reports"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <FileText size={15} />
            <span>Inspection Reports</span>
          </Link>
          <Link
            to="/admin/rules"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <Scale size={15} />
            <span>LMPC Rules</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatCard
          loading={loading}
          icon={PackageSearch}
          label="Products Scanned"
          value={summary?.totalProducts}
          tone="blue"
          sub="Indexed in database"
        />
        <StatCard
          loading={loading}
          icon={ClipboardList}
          label="Total Inspections"
          value={summary?.totalInspections}
          tone="purple"
          sub={summary ? `${summary.reportsGenerated} reports generated` : undefined}
        />
        <StatCard
          loading={loading}
          icon={CheckCircle2}
          label="Compliant Packages"
          value={summary?.compliant}
          tone="green"
          sub={summary ? `${summary.compliancePercentage}% overall pass rate` : undefined}
          trend={summary?.compliancePercentage ? `${summary.compliancePercentage}% Compliance Rate` : undefined}
        />
        <StatCard
          loading={loading}
          icon={XCircle}
          label="Non-Compliant"
          value={summary?.nonCompliant}
          tone="red"
          sub="Flagged for enforcement action"
        />
        <StatCard
          loading={loading}
          icon={AlertTriangle}
          label="Requires Review"
          value={summary?.requiresReview}
          tone="amber"
          sub="Pending officer verification"
        />
        <StatCard
          loading={loading}
          icon={ShieldAlert}
          label="High Severity Violations"
          value={summary?.highSeverityViolations}
          tone="red"
          sub={summary ? `Average score: ${summary.averageComplianceScore}%` : undefined}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
            <CardTitle icon={TrendingUp}>Monthly Inspection & Compliance Trend</CardTitle>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Last 6 Months</span>
          </div>

          {loading ? (
            <SkeletonCard lines={4} />
          ) : trends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <Activity size={28} className="mb-2 opacity-50 text-slate-400" />
              <p className="text-sm font-semibold">No inspection records logged yet</p>
              <p className="text-xs text-slate-500 mt-0.5">Run a package scan to view monthly compliance analytics.</p>
            </div>
          ) : (
            <div className="pt-2">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gInsp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f3d6e" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#0f3d6e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b822" vertical={false} />
                  <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#f8fafc',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="inspections" name="Total Inspections" stroke="#0f3d6e" fill="url(#gInsp)" strokeWidth={2} />
                  <Area type="monotone" dataKey="complianceRate" name="Compliance Rate %" stroke="#10b981" fill="transparent" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Status Breakdown Card */}
        <Card className="flex flex-col justify-between">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
            <CardTitle icon={ShieldCheck}>Compliance Status Breakdown</CardTitle>
          </div>

          {loading ? (
            <SkeletonCard lines={4} />
          ) : statusPie.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <CheckCircle2 size={28} className="mb-2 opacity-50 text-slate-400" />
              <p className="text-sm font-semibold">No data available</p>
            </div>
          ) : (
            <div className="my-auto py-2">
              <div className="relative">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={statusPie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={3}
                      stroke="transparent"
                    >
                      {statusPie.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: 8,
                        fontSize: 12,
                        color: '#f8fafc',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Value */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {summary?.compliancePercentage ?? 0}%
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Compliant
                  </span>
                </div>
              </div>

              {/* Status List */}
              <div className="mt-3 space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                {statusPie.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span>{p.name}</span>
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Violations & Recent Activity Row */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Violations by Severity */}
        <Card>
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
            <CardTitle icon={AlertTriangle}>Statutory Violations by Severity</CardTitle>
          </div>

          {loading ? (
            <SkeletonCard lines={3} />
          ) : !violations?.bySeverity?.length ? (
            <div className="flex flex-col items-center justify-center py-14 text-center text-slate-400">
              <ShieldCheck size={28} className="mb-2 text-emerald-600 opacity-70" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No violations logged</p>
              <p className="text-xs text-slate-400 mt-0.5">All scanned commodities comply with LMPC rules.</p>
            </div>
          ) : (
            <div className="pt-2">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={violations.bySeverity} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b822" horizontal={false} />
                  <XAxis type="number" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" fontSize={11} width={80} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#f8fafc',
                    }}
                  />
                  <Bar dataKey="value" name="Violations" radius={[0, 4, 4, 0]}>
                    {violations.bySeverity.map((entry) => (
                      <Cell key={entry.name} fill={SEV_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Recent Inspections Activity Register */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
            <CardTitle icon={ClipboardList}>Recent Inspection Register</CardTitle>
            <Link to="/inspections" className="text-xs font-semibold text-primary-700 hover:text-primary-800 dark:text-primary-400 flex items-center gap-1">
              <span>Full Register</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          {loading ? (
            <SkeletonCard lines={5} />
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center text-slate-400">
              <PackageSearch size={28} className="mb-2 opacity-50" />
              <p className="text-sm font-semibold">No inspections on record</p>
              <p className="text-xs text-slate-400 mt-0.5">Scanned products will appear here immediately.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recent.map((r) => (
                <li key={r._id}>
                  <Link
                    to={`/inspections/${r._id}`}
                    className="flex items-center justify-between gap-3 px-2 py-2.5 rounded-lg transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {r.productId?.productName || 'Packaged Commodity'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {r.inspectionId} · {r.location?.district || 'Central District'} · {fmtAgo(r.createdAt)}
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
