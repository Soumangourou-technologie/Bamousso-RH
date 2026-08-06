/**
 * Contexte de Thème.
 * Gère l'alternance entre le mode clair (light) et le mode sombre (dark).
 * Persiste le choix de l'utilisateur dans le stockage local du navigateur.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void; // Fonction pour changer de thème
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Fournisseur du contexte de Thème.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialisation de l'état avec 'dark' par défaut (et migration du localStorage si nécessaire)
  const [theme, setTheme] = useState<Theme>(() => {
    const hasInitializedV2 = localStorage.getItem('theme_v2_fix');
    if (!hasInitializedV2) {
      localStorage.setItem('theme_v2_fix', 'true');
      localStorage.setItem('theme', 'dark');
      return 'dark';
    }
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme as Theme) || 'dark';
  });

  // Met à jour la classe sur l'élément <html> et enregistre le choix
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  /**
   * Bascule entre le mode clair et le mode sombre.
   */
  const toggleTheme = () => {
    console.log('Toggling theme from', theme);
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook personnalisé pour utiliser le thème.
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
