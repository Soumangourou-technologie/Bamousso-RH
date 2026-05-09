import { beforeAll, afterAll, vi } from 'vitest';

// Mocker le client Prisma pour éviter de toucher à la vraie base de données pendant les tests
beforeAll(() => {
  vi.mock('../utils/prisma.js', () => {
    // Remplace l'exportation par défaut par un objet qui simule Prisma
    return {
      default: {
        // Ajoutez ici les tables et les fonctions que vos tests utilisent
        user: {
          findUnique: vi.fn(),
          findFirst: vi.fn(),
          create: vi.fn(),
        },
        // ... ajoutez d'autres modèles au besoin
      },
    };
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});
