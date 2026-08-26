import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { ProtectedRoute, RoleRoute, GuestRoute } from './guards';
import { Spinner } from '../components/ui/Feedback';

import Login from '../pages/auth/Login';
import NotFound from '../pages/NotFound';

const Dashboard = lazy(() => import('../pages/dashboard/Dashboard'));
const Scanner = lazy(() => import('../pages/scanner/Scanner'));
const Products = lazy(() => import('../pages/products/Products'));
const ProductDetails = lazy(() => import('../pages/products/ProductDetails'));
const Inspections = lazy(() => import('../pages/inspections/Inspections'));
const InspectionDetails = lazy(() => import('../pages/inspections/InspectionDetails'));
const Reports = lazy(() => import('../pages/reports/Reports'));
const Analytics = lazy(() => import('../pages/analytics/Analytics'));
const SearchResults = lazy(() => import('../pages/search/SearchResults'));
const Users = lazy(() => import('../pages/admin/Users'));
const Rules = lazy(() => import('../pages/admin/Rules'));
const AuditLogs = lazy(() => import('../pages/admin/AuditLogs'));
const SystemSettings = lazy(() => import('../pages/admin/SystemSettings'));
const NotificationsPage = lazy(() => import('../pages/account/Notifications'));
const Profile = lazy(() => import('../pages/account/Profile'));
const Settings = lazy(() => import('../pages/account/Settings'));

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Suspense fallback={<Spinner />}><Dashboard /></Suspense>} />

          {/* Inspector + Admin */}
          <Route element={<RoleRoute roles={['ADMIN', 'INSPECTOR']} />}>
            <Route path="/scanner" element={<Suspense fallback={<Spinner />}><Scanner /></Suspense>} />
            <Route path="/inspections/:id/review" element={<Suspense fallback={<Spinner />}><InspectionDetails mode="review" /></Suspense>} />
          </Route>

          <Route path="/products" element={<Suspense fallback={<Spinner />}><Products /></Suspense>} />
          <Route path="/products/:id" element={<Suspense fallback={<Spinner />}><ProductDetails /></Suspense>} />
          <Route path="/inspections" element={<Suspense fallback={<Spinner />}><Inspections /></Suspense>} />
          <Route path="/inspections/:id" element={<Suspense fallback={<Spinner />}><InspectionDetails /></Suspense>} />

          <Route element={<RoleRoute roles={['ADMIN', 'INSPECTOR', 'ANALYST']} />}>
            <Route path="/reports" element={<Suspense fallback={<Spinner />}><Reports /></Suspense>} />
            <Route path="/analytics" element={<Suspense fallback={<Spinner />}><Analytics /></Suspense>} />
          </Route>

          <Route path="/search" element={<Suspense fallback={<Spinner />}><SearchResults /></Suspense>} />
          <Route path="/notifications" element={<Suspense fallback={<Spinner />}><NotificationsPage /></Suspense>} />
          <Route path="/profile" element={<Suspense fallback={<Spinner />}><Profile /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<Spinner />}><Settings /></Suspense>} />

          <Route element={<RoleRoute roles={['ADMIN']} />}>
            <Route path="/admin/users" element={<Suspense fallback={<Spinner />}><Users /></Suspense>} />
            <Route path="/admin/audit-logs" element={<Suspense fallback={<Spinner />}><AuditLogs /></Suspense>} />
            <Route path="/admin/system" element={<Suspense fallback={<Spinner />}><SystemSettings /></Suspense>} />
            <Route path="/admin/rules" element={<Suspense fallback={<Spinner />}><Rules /></Suspense>} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
