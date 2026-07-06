import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Middleware de gestion des erreurs centralisé.
 * Capture les erreurs et envoie une réponse HTTP formatée.
 */
const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Erreur Interne du Serveur';

  // En mode développement, on envoie plus de détails
  if (process.env.NODE_ENV === 'development') {
    console.error('ERREUR 💥', err);
    return res.status(err.statusCode).json({
      status: 'error',
      statusCode: err.statusCode,
      message: err.message
    });
  }

  // En mode production, on n'envoie que des messages d'erreur clairs et non techniques
  if (err.isOperational) {
    // Erreurs "attendues" (ex: mauvais input utilisateur)
    return res.status(err.statusCode).json({
      status: 'fail',
      message: err.message
    });
  } else {
    // Erreurs de programmation ou inconnues : on ne veut pas les fuiter
    // 1. Logger l'erreur
    console.error('ERREUR 💥', err);
    // 2. Envoyer une réponse générique
    return res.status(500).json({
      status: 'error',
      message: 'Une erreur inattendue est survenue. Notre équipe a été notifiée.'
    });
  }
};

export default errorHandler;
