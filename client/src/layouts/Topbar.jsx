import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Moon, Sun, Bell, Search } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleTheme, setSidebarOpen } from '../redux/slices/uiSlice';
import { fetchNotifications, markRead } from '../redux/slices/notificationsSlice';
import { Avatar } from './Sidebar';
import { fmtAgo } from '../utils/format';

export default function Topbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useSelector((s) => s.ui.theme);
  const user = useSelector((s) => s.auth.user);
  const notifications = useSelector((s) => s.notifications);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (user) dispatch(fetchNotifications());
  }, [dispatch, user]);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleBellClick = () => {
    setOpen((o) => !o);
    if (!open && user) dispatch(fetchNotifications());
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 px-4 backdrop-blur">
      <button className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={() => dispatch(setSidebarOpen(true))} aria-label="Open menu">
        <Menu size={19} />
      </button>

      <form
        className="relative hidden flex-1 max-w-md sm:block"
        onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get('q');
          if (q?.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input name="q" placeholder="Search products, inspections, rule codes…" className="input pl-9 py-1.5" />
      </form>

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => dispatch(toggleTheme())}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative" ref={ref}>
          <button
            data-testid="notif-bell"
            onClick={handleBellClick}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Notifications"
          >
            <Bell size={18} />
            {notifications.unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {notifications.unreadCount}
              </span>
            )}
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-400">
                Notifications
                <button
                  className="text-[11px] font-semibold normal-case text-primary-600 hover:underline dark:text-primary-400"
                  onClick={() => { dispatch(markRead()); setOpen(false); }}
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.items.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-slate-400">No notifications yet</p>
                )}
                {notifications.items.slice(0, 8).map((n) => (
                  <Link
                    key={n._id}
                    to={n.link || '/notifications'}
                    onClick={() => setOpen(false)}
                    className={`block border-t border-slate-100 px-4 py-3 text-sm transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60 ${!n.isRead ? 'bg-primary-50/60 dark:bg-primary-900/20' : ''}`}
                  >
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{n.message}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{fmtAgo(n.createdAt)}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {user && (
          <Link to="/profile" className="ml-1" title={`${user.name} (${user.role})`}>
            <Avatar name={user.name} size="h-8 w-8" />
          </Link>
        )}
      </div>
    </header>
  );
}
