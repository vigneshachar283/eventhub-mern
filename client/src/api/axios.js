import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 handling:
//  - Auth endpoints (login / register) return 401 for wrong credentials — let
//    those errors propagate normally so the form can display them.
//  - For any other 401 where we actually sent a token, the session has expired.
//    Clear storage and fire a custom event; AuthContext listens and sets user
//    to null, which triggers ProtectedRoute to redirect — no full page reload.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url ?? '';
    const isAuthEndpoint =
      url.startsWith('/auth/login') || url.startsWith('/auth/register');

    if (
      err.response?.status === 401 &&
      !isAuthEndpoint &&
      localStorage.getItem('token')
    ) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth:expired'));
    }

    return Promise.reject(err);
  }
);

export default api;
