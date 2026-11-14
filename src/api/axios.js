import axios from 'axios';

// The backend serves everything under /api. Accept VITE_API_BASE_URL with or without it
// (e.g. "https://x.onrender.com" or "https://x.onrender.com/api/").
const apiBase = () => {
  const raw = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
  return /\/api$/.test(raw) ? raw : `${raw}/api`;
};

const api = axios.create({
  baseURL: apiBase(),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('oh_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('oh_token');
      localStorage.removeItem('oh_user');
    }
    return Promise.reject(err);
  }
);

export default api;
