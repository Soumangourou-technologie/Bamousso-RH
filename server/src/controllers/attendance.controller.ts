import { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { notifyAdmins } from "../utils/notifications.js";

// L'employé pointe son arrivée ou son départ
export const toggleClock = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;
    const { latitude: lat, longitude: lon } = req.body;

    const parseCoord = (coord: any): number | null => {
      if (coord === null || coord === undefined || coord === "") return null;
      const num = parseFloat(coord);
      return isNaN(num) ? null : num;
    };

    const latitude = parseCoord(lat);
    const longitude = parseCoord(lon);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Cherche s'il y a déjà un pointage pour aujourd'hui
    let attendance = await prisma.attendance.findFirst({
      where: {
        employeeId: userId,
        date: {
          gte: today,
        }
      }
    });

    if (!attendance) {
      // Pointage d'arrivée (Check In)
      attendance = await prisma.attendance.create({
        data: {
          employeeId: userId,
          date: new Date(),
          checkIn: new Date(),
          status: "PRESENT",
          latitude,
          longitude
        }
      });

      // Notifier les admins
      const user = (req as any).user;
      const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, email: true } });
      const userName = dbUser && dbUser.firstName && dbUser.lastName ? `${dbUser.firstName} ${dbUser.lastName}` : (dbUser?.email || "Un employé");
      await notifyAdmins(user.companyId, "Nouveau Pointage", `${userName} vient de pointer son arrivée.`);

      return res.status(201).json({ message: "Arrivée enregistrée avec succès", attendance });
    } else if (!attendance.checkOut) {
      // Pointage de départ (Check Out)
      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: { 
          checkOut: new Date(),
          latitude, // on peut mettre à jour ou garder l'ancien
          longitude
        }
      });

      // Notifier les admins
      const user = (req as any).user;
      const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, email: true } });
      const userName = dbUser && dbUser.firstName && dbUser.lastName ? `${dbUser.firstName} ${dbUser.lastName}` : (dbUser?.email || "Un employé");
      await notifyAdmins(user.companyId, "Départ Pointage", `${userName} vient de pointer son départ.`);

      return res.json({ message: "Départ enregistré avec succès", attendance });
    } else {
      return res.status(400).json({ message: "Vous avez déjà terminé votre journée." });
    }
  } catch (error: any) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

export const getAttendances = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    
    if (user.role === "EMPLOYEE") {
      const attendances = await prisma.attendance.findMany({
        where: { employeeId: user.id },
        orderBy: { date: 'desc' }
      });
      return res.json(attendances);
    }

    // HR/Admin voit tout pour leur entreprise
    const attendances = await prisma.attendance.findMany({
      where: {
        employee: { companyId: user.companyId }
      },
      include: { employee: { select: { firstName: true, lastName: true } } },
      orderBy: { date: 'desc' }
    });
    
    res.json(attendances);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};
