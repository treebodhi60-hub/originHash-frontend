import api from '../api/axios';

// The supply-chain module's API (/api/connect), on the app's own client and session.
const prefix = (url) => `/connect${url}`;
const connectApi = {
  get: (url, config) => api.get(prefix(url), config),
  post: (url, data, config) => api.post(prefix(url), data, config),
  put: (url, data, config) => api.put(prefix(url), data, config),
  patch: (url, data, config) => api.patch(prefix(url), data, config),
  delete: (url, config) => api.delete(prefix(url), config),
};

export const errorText = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.message || (err?.response ? fallback : "Couldn't reach OriginHash. Check your connection and try again.");

// Downloads a file the API streams (PDF / CSV) with the session attached.
export const downloadFile = async (url, fallbackName) => {
  const res = await connectApi.get(url, { responseType: 'blob' });
  const name = /filename="([^"]+)"/.exec(res.headers['content-disposition'] || '')?.[1] || fallbackName;
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
};

// Uploads one file; resolves to { ref, url, name }.
export const uploadFile = async (endpoint, file, folder) => {
  const body = new FormData();
  body.append('folder', folder);
  body.append('file', file);
  const { data } = await connectApi.post(endpoint, body);
  return data.file;
};

// Where the OriginHash superadmin signs in: a path no page links to (set VITE_SUPERADMIN_LOGIN_PATH).
export const SUPERADMIN_LOGIN_PATH = `/${String(import.meta.env.VITE_SUPERADMIN_LOGIN_PATH || 'ohq-7c41e9').replace(/^\/+|\/+$/g, '')}`;

// The superadmin's supply-chain pages, inside the admin panel.
export const CHAIN_ADMIN = '/admin/chain';

export default connectApi;
