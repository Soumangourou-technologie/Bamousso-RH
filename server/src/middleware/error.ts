import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware global de gestion des erreurs.
 * Capture toutes les erreurs non traitées et renvoie une réponse JSON standardisée.
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.status || err.statusCode || 500;
  
  // Log de l'erreur pour le serveur
  console.error('[Error] %s %s:', req.method, req.path, err);

  const response = {
    message: err.message || 'Une erreur interne est survenue.',
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  res.status(statusCode).json(response);
};
