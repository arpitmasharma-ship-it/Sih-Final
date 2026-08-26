import { format, formatDistanceToNow } from 'date-fns';

export const fmtDate = (d) => (d ? format(new Date(d), 'dd MMM yyyy') : '—');
export const fmtDateTime = (d) => (d ? format(new Date(d), 'dd MMM yyyy, HH:mm') : '—');
export const fmtAgo = (d) => (d ? `${formatDistanceToNow(new Date(d))} ago` : '—');
export const fmtPercent = (n) => `${Math.round(n ?? 0)}%`;

export function titleize(s) {
  return String(s || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function toastError(e, fallback = 'Something went wrong') {
  return e?.friendlyMessage || e?.response?.data?.message || fallback;
}
