import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AppRoutes from './routes/AppRoutes';
import { loadMe } from './redux/slices/authSlice';

export default function App() {
  const dispatch = useDispatch();
  const theme = useSelector((s) => s.ui.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    dispatch(loadMe());
  }, [dispatch]);

  return (
    <>
      <AppRoutes />
      <ToastContainer
        position="top-right"
        autoClose={4000}
        theme={theme === 'dark' ? 'dark' : 'light'}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss={false}
      />
    </>
  );
}
