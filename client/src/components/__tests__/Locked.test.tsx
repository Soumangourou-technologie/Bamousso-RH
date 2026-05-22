import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Locked from '../../pages/Locked';

// Mock du contexte d'authentification
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    company: { name: 'Entreprise Test', plan: 'LOUBA', extraEmployees: 0 },
    logout: vi.fn(),
  }),
}));

describe('Locked Component', () => {
  it('doit afficher le nom de l\'entreprise verrouillée', () => {
    render(
      <BrowserRouter>
        <Locked />
      </BrowserRouter>
    );
    
    // Vérifier la présence du texte attendu
    expect(screen.getByText(/Accès suspendu/i)).toBeDefined();
    expect(screen.getByText(/Entreprise Test/i)).toBeDefined();
    expect(screen.getByText(/Renouveler l'abonnement/i)).toBeDefined();
  });
});
