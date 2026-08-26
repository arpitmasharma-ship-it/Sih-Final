import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { BellRing, CheckCheck } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Spinner, EmptyState } from '../../components/ui/Feedback';
import { fmtDateTime, fmtAgo } from '../../utils/format';
import { markRead, fetchNotifications } from '../../redux/slices/notificationsSlice';

const TYPE_CLS = {
  SUCCESS: 'border-l-emerald-500',
  WARN: 'border-l-amber-500',
  CRITICAL: 'border-l-red-500',
  INFO: 'border-l-blue-500',
};

export default function Notifications() {
  const dispatch = useDispatch();
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.get('/notifications', { params: { limit: 50 } })
      .then((r) => setItems(r.data.data?.items || []))
      .catch(() => setItems([]));
  }, []);

  const markAll = async () => {
    await dispatch(markRead());
    dispatch(fetchNotifications());
    setItems((prev) => prev?.map((n) => ({ ...n, isRead: true })) || []);
  };

  if (!items) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Critical violation alerts and inspection updates."
        right={
          items.some((n) => !n.isRead) && (
            <Button variant="secondary" size="sm" icon={CheckCheck} onClick={markAll}>
              Mark all read
            </Button>
          )
        }
      />

      {items.length === 0 ? (
        <EmptyState icon={BellRing} title="No notifications" message="Alerts about high-severity findings will appear here." />
      ) : (
        <div className="space-y-2.5">
          {items.map((n) => (
            <Card key={n._id} className={`border-l-4 ${TYPE_CLS[n.type] || TYPE_CLS.INFO} ${!n.isRead ? 'ring-1 ring-primary-200 dark:ring-primary-800' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-700 dark:text-slate-100">{n.title}</p>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{n.message}</p>
                  <p className="mt-1.5 text-[11px] text-slate-400">{fmtDateTime(n.createdAt)} · {fmtAgo(n.createdAt)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {!n.isRead && <Badge status="REQUIRES_REVIEW" label="new" size="xs" />}
                  {n.link && (
                    <Link to={n.link} className="text-xs font-semibold text-primary-700 hover:underline dark:text-primary-400">
                      Open →
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
