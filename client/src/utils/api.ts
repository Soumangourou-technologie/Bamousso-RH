import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'production' ? '' : 'http://localhost:3001');
// On enlève le /api à la fin s'il existe pour éviter le doublon car on le rajoute après
export const API_URL = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;

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

// Plus besoin d'intercepteur pour ajouter le token car on utilise HttpOnly cookies

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;

    if (status === 401) {
      // Session expirée ou invalide -> Logout
      localStorage.removeItem('user');
      localStorage.removeItem('company');
      if (window.location.pathname !== '/login') {
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
