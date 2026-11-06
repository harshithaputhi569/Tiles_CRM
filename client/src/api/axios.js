import axios from 'axios';

// In production, fallback to live Render backend if VITE_API_URL is not set
// In local dev, Vite proxy handles /api → localhost:5000
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://tiles-crm.onrender.com/api' : '/api'),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tileshow_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('tileshow_token');
      localStorage.removeItem('tileshow_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
