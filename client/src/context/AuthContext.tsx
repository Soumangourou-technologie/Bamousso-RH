/**
 * Contexte d'Authentification.
 * Gère l'état global de l'utilisateur connecté, le stockage du token JWT
 * et les fonctions de connexion/déconnexion.
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../utils/api';

// Structure d'un utilisateur
interface User {
  id: string;
  email: string;
  role:
    | 'SUPER_ADMIN'
    | 'COMPANY_ADMIN'
    | 'HR_MANAGER'
    | 'HR_ASSISTANT'
    | 'COMMERCIAL'
    | 'EMPLOYEE';
  firstName: string;
  lastName: string;
  companyId?: string;
  status?: 'INVITED' | 'ACTIVE' | 'INACTIVE';
  permissions: string[];
}

interface Company {
  id: string;
  name: string;
  isLocked: boolean;
  isActive?: boolean;
  logoUrl?: string | null;
  plan?: 'FITINI' | 'LOUBA' | 'KORO';
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
  subscriptionStatus?: string;
  extraEmployees?: number;
}

// Définition du type de contexte
interface AuthContextType {
  user: User | null;      // Utilisateur actuellement connecté
  token: string | null;   // Token JWT pour les appels API
  company: Company | null;
  login: (token: string, user: User, company?: Company | null) => void; // Fonction de connexion
  logout: () => void;     // Fonction de déconnexion
  isLoading: boolean;     // État de chargement initial
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Fournisseur du contexte Auth.
 * Enveloppe l'application pour rendre l'état auth accessible partout.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Au chargement, on vérifie si un utilisateur est déjà stocké dans le navigateur
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedCompany = localStorage.getItem('company');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      if (storedCompany) setCompany(JSON.parse(storedCompany));
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      
      // OPTIMISATION : On demande au serveur les dernières infos pour être sûr du plan
      const fetchLatestInfo = async () => {
        try {
          // Utilisation de l'instance 'api' configurée
          const response = await api.get('/auth/me');
          if (response.data.success) {
            const { user: latestUser, company: latestCompany } = response.data;
            setUser(latestUser);
            setCompany(latestCompany);
            localStorage.setItem('user', JSON.stringify(latestUser));
            if (latestCompany) localStorage.setItem('company', JSON.stringify(latestCompany));
          }
        } catch (error) {
          console.error("Erreur lors de la mise à jour des infos auth:", error);
        }
      };
      fetchLatestInfo();
    }
    
    setIsLoading(false);
  }, []);

  /**
   * Connecte l'utilisateur en stockant ses infos localement.
   */
  const login = (newToken: string, newUser: User, newCompany?: Company | null) => {
    setToken(newToken);
    setUser(newUser);
    setCompany(newCompany || null);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    if (newCompany) localStorage.setItem('company', JSON.stringify(newCompany));
    else localStorage.removeItem('company');
    
    // Ajoute le token aux headers Axios pour les prochaines requêtes
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  /**
   * Déconnecte l'utilisateur et nettoie le stockage local.
   */
  const logout = () => {
    setToken(null);
    setUser(null);
    setCompany(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('company');
    delete api.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, company, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook personnalisé pour utiliser le contexte d'authentification plus facilement.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
