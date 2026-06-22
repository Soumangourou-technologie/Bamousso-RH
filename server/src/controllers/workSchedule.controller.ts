import { Response } from "express";
import prisma from "../utils/prisma.js";

// Créer un horaire
export const createWorkSchedule = async (req: any, res: Response) => {
  try {
    const { name, type, startTime, endTime, breakMinutes, hoursPerDay, hoursPerWeek } = req.body;
    const companyId = req.user.companyId;

    const schedule = await prisma.workSchedule.create({
      data: {
        name,
        type,
        startTime,
        endTime,
        breakMinutes: breakMinutes ? Number(breakMinutes) : 60,
        hoursPerDay: hoursPerDay ? Number(hoursPerDay) : 8,
        hoursPerWeek: hoursPerWeek ? Number(hoursPerWeek) : 40,
        companyId
      }
    });

    res.status(201).json(schedule);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la création de l'horaire", error: error.message });
  }
};

// Obtenir tous les horaires de l'entreprise
export const getWorkSchedules = async (req: any, res: Response) => {
  try {
    const companyId = req.user.companyId;
    const schedules = await prisma.workSchedule.findMany({
      where: { companyId },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });
    res.json(schedules);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération", error: error.message });
  }
};

// Assigner un horaire à un employé
export const assignSchedule = async (req: any, res: Response) => {
  try {
    const { employeeId, scheduleId } = req.body;
    const companyId = req.user.companyId;

    const updatedUser = await prisma.user.update({
      where: { id: employeeId, companyId },
      data: { workScheduleId: scheduleId }
    });

    res.json({ message: "Horaire assigné avec succès", user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de l'assignation", error: error.message });
  }
};

// Assigner un horaire à un département
export const assignScheduleToDepartment = async (req: any, res: Response) => {
  try {
    const { departmentId, scheduleId } = req.body;
    const companyId = req.user.companyId;

    const updatedUsers = await prisma.user.updateMany({
      where: { departmentId, companyId },
      data: { workScheduleId: scheduleId }
    });

    res.json({ message: `Horaire assigné avec succès à ${updatedUsers.count} employés du département.` });
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de l'assignation au département", error: error.message });
  }
};

// Supprimer un horaire
export const deleteWorkSchedule = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    await prisma.workSchedule.delete({
      where: { id, companyId }
    });

    res.json({ message: "Horaire supprimé" });
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la suppression", error: error.message });
  }
};
