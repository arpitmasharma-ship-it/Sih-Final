import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../redux/slices/authSlice';

export function useAuth() {
  return useSelector(selectUser);
}

export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `LMCC — ${title}` : 'LMCC Platform';
  }, [title]);
}
