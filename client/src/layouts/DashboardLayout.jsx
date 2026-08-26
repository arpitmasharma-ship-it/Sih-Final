import { Outlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useSelector, useDispatch } from 'react-redux';
import { setSidebarOpen } from '../redux/slices/uiSlice';

export default function DashboardLayout() {
  const sidebarOpen = useSelector((s) => s.ui.sidebarOpen);
  const dispatch = useDispatch();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block shrink-0">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
              onClick={() => dispatch(setSidebarOpen(false))}
            />
            <div className="fixed inset-y-0 left-0 z-40 lg:hidden">
              <Sidebar />
            </div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
