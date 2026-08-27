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
    <aside className="flex h-full w-64 flex-col border-r border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
      {/* Brand Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/80 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-800 dark:bg-primary-700 text-white shadow-xs">
          <ShieldCheck size={19} />
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">LMCC Portal</span>
            <span className="rounded px-1.5 py-0.2 text-[9px] font-bold bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
              v2.4
            </span>
          </div>
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Legal Metrology DCA</p>
        </div>
        <button className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={() => dispatch(setSidebarOpen(false))} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV.map((item, i) =>
          item.section ? (
            <div key={`${item.section}-${i}`} className="mt-5 mb-1.5 px-3 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {item.section}
              </span>
              <div className="h-px flex-1 ml-2 bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : item.roles.includes(user.role) ? (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => dispatch(setSidebarOpen(false))}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-primary-50 text-primary-900 dark:bg-primary-950/80 dark:text-primary-200 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary-700 dark:bg-primary-400" />
                  )}
                  <item.icon size={16} className={isActive ? 'text-primary-700 dark:text-primary-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ) : null
        )}
      </nav>

      {/* User Profile Bar */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 p-3">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-800/40 p-2.5">
          <Avatar name={user.name} size="h-8 w-8" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">{user.name}</p>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{user.role}</p>
          </div>
          <button onClick={handleLogout} title="Sign out" className="rounded-lg p-1.5 text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 shadow-2xs transition">
            <LogOut size={15} />
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
