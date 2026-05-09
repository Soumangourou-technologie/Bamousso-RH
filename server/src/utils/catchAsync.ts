import { Request, Response, NextFunction } from 'express';

/**
 * Wrapper pour les fonctions de contrôleur asynchrones.
 * Capture les erreurs et les passe au middleware d'erreurs Express.
 */
export const catchAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};
