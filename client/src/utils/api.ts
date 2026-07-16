import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const rawApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'production' ? '' : 'http://localhost:3001');
// On enlève le /api à la fin s'il existe pour éviter le doublon car on le rajoute après
let API_URL_INTERNAL = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;

// Forcer l'URL de production sur l'application mobile native
if (Capacitor.isNativePlatform()) {
  API_URL_INTERNAL = 'https://www.bamousso.com';
}

export const API_URL = API_URL_INTERNAL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

export const getFileUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/uploads')) return `${API_URL}${path}`;
    return path;
}

// Intercepteur pour empêcher la mise en cache agressive des requêtes GET (surtout sur mobile)
api.interceptors.request.use((config) => {
  if (config.method?.toLowerCase() === 'get') {
    config.params = { ...config.params, _t: Date.now() };
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;

    if (status === 401) {
      // Session expirée ou invalide -> Logout
      localStorage.removeItem('user');
      localStorage.removeItem('company');
      
      const publicPaths = ['/', '/login', '/register', '/payment', '/payment-success', '/payment-cancelled', '/forgot-password', '/reset-password', '/client-registration'];
      
      if (!publicPaths.includes(window.location.pathname)) {
        window.location.assign('/login?expired=true');
      }
    }

    if (status === 423 && code === 'COMPANY_LOCKED') {
      // Redirection simple (sans hook) vers l'écran "verrouillé"
      if (window.location.pathname !== '/locked') {
        window.location.assign('/locked');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
