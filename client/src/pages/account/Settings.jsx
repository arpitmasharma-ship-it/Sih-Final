import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { toggleTheme } from '../../redux/slices/uiSlice';

export default function Settings() {
  const dispatch = useDispatch();
  const theme = useSelector((s) => s.ui.theme);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" subtitle="Appearance and workspace preferences." />

      <Card>
        <CardTitle>Appearance</CardTitle>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-slate-700 dark:text-slate-200">Theme</p>
            <p className="text-xs text-slate-400">Currently using the {theme} theme.</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              dispatch(toggleTheme());
              toast.success(`Switched to ${theme === 'dark' ? 'light' : 'dark'} theme`);
            }}
          >
            Switch to {theme === 'dark' ? 'light' : 'dark'}
          </Button>
        </div>
      </Card>

      <Card className="mt-4">
        <CardTitle>Data & privacy</CardTitle>
        <ul className="list-inside list-disc space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
          <li>All inspection evidence is stored with immutable audit trails.</li>
          <li>OCR data is retained to support verification and appeals.</li>
          <li>Reports carry SHA-256 content checksums for tamper evidence.</li>
        </ul>
      </Card>
    </div>
  );
}
