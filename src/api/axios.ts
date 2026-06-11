import axios from 'axios';

// In development, use /api as baseURL (Vite proxy handles it)
// In production, use VITE_API_URL or default to localhost:3001
const isDev = import.meta.env.DEV;
const api = axios.create({
  baseURL: isDev ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:3001'),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('steakz_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default api;