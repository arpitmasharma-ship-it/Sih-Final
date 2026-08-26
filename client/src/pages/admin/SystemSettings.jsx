import { useEffect, useState } from 'react';
import { Database, ScanLine, FileText, Users, RefreshCw, Cpu } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardTitle } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Feedback';
import { toastError } from '../../utils/format';
import { SERVER_URL } from '../../services/api';

export default function SystemSettings() {
  const [system, setSystem] = useState(null);
  const [rulesCount, setRulesCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await api.get('/dashboard/system');
        setSystem(s.data.data);
      } catch (e) {
        toastError(e);
      }
      try {
        const r = await api.get('/rules');
        setRulesCount((r.data.data || []).length);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const sync = async () => {
    setSyncing(true);
    try {
      await api.post('/rules/sync');
      const r = await api.get('/rules');
      setRulesCount((r.data.data || []).length);
    } catch (e) {
      toastError(e);
    } finally {
      setSyncing(false);
    }
  };

  if (!system) return <Spinner />;

  return (
    <div>
      <PageHeader title="System" subtitle="Platform health and configuration overview." />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon={Users} label="Users" value={system.users} tone="blue" />
        <StatCard icon={Database} label="Products" value={system.products} tone="slate" />
        <StatCard icon={ScanLine} label="Inspections" value={system.inspections} tone="green" />
        <StatCard icon={FileText} label="Reports" value={system.reports} tone="amber" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle icon={Cpu}>Rulebook</CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <strong className="text-2xl font-extrabold text-slate-800 dark:text-white">{rulesCount}</strong> rules loaded
            (14 official LMPC seed rules + custom).
          </p>
          <div className="mt-3">
            <Button variant="secondary" icon={RefreshCw} loading={syncing} onClick={sync}>
              Re-sync official seed
            </Button>
          </div>
        </Card>

        <Card>
          <CardTitle>Environment</CardTitle>
          <dl className="space-y-1.5 text-xs">
            {[
              ['API base', `${SERVER_URL}/api`],
              ['Build mode', import.meta.env.MODE || 'development'],
              ['Rule cache', 'in-memory · 60s TTL'],
              ['Storage', 'local disk or Cloudinary (S3-compatible swap point)'],
              ['OCR providers', 'tesseract · demo simulation · remote HTTP'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-dashed border-slate-100 pb-1 dark:border-slate-800">
                <dt className="text-slate-400">{k}</dt>
                <dd className="text-right font-semibold text-slate-600 dark:text-slate-300">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  );
}
