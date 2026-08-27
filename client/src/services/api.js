import axios from 'axios';

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${SERVER_URL}/api`,
  withCredentials: true,
  timeout: 120000,
});

// Fast in-memory cache for GET requests (10s TTL)
const clientCache = new Map();

function getCacheKey(config) {
  if (config.method?.toLowerCase() !== 'get') return null;
  if (config.responseType === 'blob' || config.responseType === 'arraybuffer') return null;
  const url = config.url || '';
  if (url.includes('/auth/me') || url.includes('/pdf') || url.includes('/export')) return null;
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${url}?${params}`;
}

export function clearClientCache() {
  clientCache.clear();
}

api.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase();
  // Clear cache on write operations
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    clientCache.clear();
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    const key = getCacheKey(res.config);
    if (key) {
      clientCache.set(key, { data: res.data, time: Date.now() });
    }
    return res;
  },
  (err) => {
    const message =
      err?.response?.data?.message ||
      (err.code === 'ERR_NETWORK'
        ? 'Cannot reach the server. Is the backend running?'
        : err.message || 'Request failed');
    return Promise.reject(Object.assign(err, { friendlyMessage: message }));
  }
);

export function buildAssetUrl(url) {
  if (!url) return '';
  if (/^(https?:\/\/|data:|blob:)/i.test(url)) return url;
  const base = (SERVER_URL || '').replace(/\/$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${base}${cleanPath}`;
}

export default api;
