import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ScanLine, PackageSearch, ClipboardList, FileBarChart2,
  BarChart3, Search, Bell, Users, Scale, ScrollText, Settings, UserCircle,
  ShieldCheck, LogOut, X,
} from 'lucide-react';
import { useAuth } from '../hooks';
import { useDispatch } from 'react-redux';
import { logout } from '../redux/slices/authSlice';
import { setSidebarOpen } from '../redux/slices/uiSlice';
import { toast } from 'react-toastify';
import { toastError } from '../utils/format';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'INSPECTOR', 'ANALYST'] },
  { to: '/scanner', label: 'Scan Product', icon: ScanLine, roles: ['ADMIN', 'INSPECTOR'] },
  { section: 'Records' },
  { to: '/products', label: 'Products', icon: PackageSearch, roles: ['ADMIN', 'INSPECTOR', 'ANALYST'] },
  { to: '/inspections', label: 'Inspections', icon: ClipboardList, roles: ['ADMIN', 'INSPECTOR', 'ANALYST'] },
  { to: '/reports', label: 'Reports', icon: FileBarChart2, roles: ['ADMIN', 'INSPECTOR', 'ANALYST'] },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['ADMIN', 'INSPECTOR', 'ANALYST'] },
  { to: '/search', label: 'Global Search', icon: Search, roles: ['ADMIN', 'INSPECTOR', 'ANALYST'] },
  { section: 'Administration' },
  { to: '/admin/users', label: 'User Management', icon: Users, roles: ['ADMIN'] },
  { to: '/admin/rules', label: 'Compliance Rules', icon: Scale, roles: ['ADMIN', 'INSPECTOR', 'ANALYST'], adminWriteOnlyNote: true },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, roles: ['ADMIN'] },
  { to: '/admin/system', label: 'System', icon: ShieldCheck, roles: ['ADMIN'] },
  { section: 'Account' },
  { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['ADMIN', 'INSPECTOR', 'ANALYST'] },
  { to: '/profile', label: 'Profile', icon: UserCircle, roles: ['ADMIN', 'INSPECTOR', 'ANALYST'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['ADMIN', 'INSPECTOR', 'ANALYST'] },
];

export default function Sidebar() {
  const user = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      toast.info('Logged out');
      navigate('/login');
    } catch (e) {
      toast.error(toastError(e));
    }
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-800 text-white">
          <ShieldCheck size={19} />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">LMCC Platform</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Legal Metrology</p>
        </div>
        <button className="ml-auto lg:hidden" onClick={() => dispatch(setSidebarOpen(false))} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV.map((item, i) =>
          item.section ? (
            <p key={`${item.section}-${i}`} className="mt-4 mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {item.section}
            </p>
          ) : item.roles.includes(user.role) ? (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => dispatch(setSidebarOpen(false))}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-primary-800 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ) : null
        )}
      </nav>

      <div className="border-t border-slate-100 dark:border-slate-800 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{user.name}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">{user.role}</p>
          </div>
          <button onClick={handleLogout} title="Log out" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function Avatar({ name = '?', size = 'h-9 w-9' }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-primary-900 text-xs font-bold text-white`}>
      {initials}
    </div>
  );
}
