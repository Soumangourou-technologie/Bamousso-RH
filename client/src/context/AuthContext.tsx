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
  company: Company | null;
  login: (user: User, company?: Company | null) => void; // Fonction de connexion
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
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Au chargement, on vérifie si l'utilisateur a une session valide via cookie HttpOnly
  useEffect(() => {
    const fetchLatestInfo = async () => {
      try {
        const response = await api.get('/auth/me');
        if (response.data.success) {
          const { user: latestUser, company: latestCompany } = response.data;
          setUser(latestUser);
          setCompany(latestCompany);
          localStorage.setItem('user', JSON.stringify(latestUser));
          if (latestCompany) localStorage.setItem('company', JSON.stringify(latestCompany));
        }
      } catch (error) {
        console.log("Session non valide au démarrage (utilisateur non connecté).");
        // On nettoie le localStorage au cas où
        localStorage.removeItem('user');
        localStorage.removeItem('company');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLatestInfo();
  }, []);

  /**
   * Connecte l'utilisateur en stockant ses infos localement.
   * Le token est géré par des cookies HttpOnly par le backend.
   */
  const login = (newUser: User, newCompany?: Company | null) => {
    setUser(newUser);
    setCompany(newCompany || null);
    localStorage.setItem('user', JSON.stringify(newUser));
    if (newCompany) localStorage.setItem('company', JSON.stringify(newCompany));
    else localStorage.removeItem('company');
  };

  /**
   * Déconnecte l'utilisateur et nettoie le stockage local.
   */
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error("Erreur lors de la déconnexion serveur:", e);
    }
    setUser(null);
    setCompany(null);
    localStorage.removeItem('user');
    localStorage.removeItem('company');
  };

  return (
    <AuthContext.Provider value={{ user, company, login, logout, isLoading }}>
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
