import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Spinner } from '../components/ui/Feedback';

export function ProtectedRoute() {
  const status = useSelector((s) => s.auth.status);
  const booted = useSelector((s) => s.auth.booted);
  const location = useLocation();
  if (status === 'loading' || (status === 'idle' && !booted)) {
    return <Spinner />;
  }
  if (status !== 'authenticated') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
}

export function RoleRoute({ roles }) {
  const user = useSelector((s) => s.auth.user);
  if (!user) return <Navigate to="/" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function GuestRoute() {
  const status = useSelector((s) => s.auth.status);
  const booted = useSelector((s) => s.auth.booted);
  if (!booted || status === 'loading') return <Spinner />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <Outlet />;
}
