import axios from 'axios';

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${SERVER_URL}/api`,
  withCredentials: true,
  timeout: 120000,
});

api.interceptors.response.use(
  (res) => res,
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
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SERVER_URL}${url}`;
}

export default api;
