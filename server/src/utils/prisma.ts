import { PrismaClient } from "@prisma/client";
import dotenv from 'dotenv';

// Charger les variables d'environnement du fichier .env
dotenv.config();

const prisma = new PrismaClient();

export default prisma;
