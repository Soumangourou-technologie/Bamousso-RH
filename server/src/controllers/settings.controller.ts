import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getPublicSettings = async (req: Request, res: Response) => {
  try {
    // @ts-ignore: Prisma client needs IDE TS Server restart to recognize this new model
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'WHATSAPP_CONTACTS' }
    });
    
    // Si les numéros n'ont pas encore été configurés, renvoyer un tableau vide
    const contacts = setting ? setting.value : [];
    
    res.json({ contacts });
  } catch (error) {
    console.error('Error fetching public settings', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des paramètres' });
  }
};
