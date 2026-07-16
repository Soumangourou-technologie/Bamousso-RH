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
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;
  
  console.error('ERREUR 💥', err);

  if (isOperational) {
    return res.status(statusCode).json({
      status: 'fail',
      message: err.message
    });
  }

  return res.status(statusCode).json({
    status: 'error',
    message: 'Une erreur interne est survenue.'
  });
};

export default errorHandler;
