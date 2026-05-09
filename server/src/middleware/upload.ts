import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import type { Request, Response, NextFunction } from 'express';
import { Buffer } from 'node:buffer';

// Use memory storage for serverless environments (Vercel)
const storage = multer.memoryStorage();

// File filter to restrict file types (initial check by extension/mimetype)
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = [
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'text/plain',
    'text/csv'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé : ${file.mimetype}`), false);
  }
};

export const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

/**
 * Middleware de validation robuste du type de fichier via analyse binaire (Magic Numbers)
 */
export const validateFileType = async (req: Request, res: Response, next: NextFunction) => {
  const file = (req as any).file;
  if (!file) return next();

  try {
    const type = await fileTypeFromBuffer(file.buffer);
    
    // Si file-type ne reconnaît pas le fichier, on vérifie si c'est un format texte autorisé
    if (!type) {
      const allowedTextTypes = ['text/plain', 'text/csv'];
      if (allowedTextTypes.includes(file.mimetype)) {
        return next();
      }
      return res.status(400).json({ message: "Contenu du fichier non reconnu ou potentiellement dangereux." });
    }

    const allowedMimes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/webm'
    ];

    if (!allowedMimes.includes(type.mime)) {
      return res.status(400).json({ message: `Le contenu réel du fichier (${type.mime}) ne correspond pas aux types autorisés.` });
    }

    next();
  } catch (error) {
    console.error("Erreur lors de la validation du type de fichier:", error);
    res.status(500).json({ message: "Erreur lors de la validation du fichier." });
  }
};
