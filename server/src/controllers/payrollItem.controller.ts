import { Request, Response } from "express";
import prisma from "../utils/prisma.js";

export const createPayrollItem = async (req: any, res: Response) => {
  try {
    const { name, type, amountType, amount, isMonthly, employeeId } = req.body;
    const companyId = req.user.companyId;

    const item = await prisma.payrollItem.create({
      data: {
        name,
        type, // BONUS, DEDUCTION
        amountType, // FIXED, PERCENTAGE
        amount: Number(amount),
        isMonthly: isMonthly || false,
        employeeId: employeeId || null,
        companyId
      }
    });

    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la création de la prime/déduction", error: error.message });
  }
};

export const getPayrollItems = async (req: any, res: Response) => {
  try {
    const companyId = req.user.companyId;
    const items = await prisma.payrollItem.findMany({
      where: { companyId },
      include: {
        employee: {
          select: { firstName: true, lastName: true }
        }
      }
    });
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération", error: error.message });
  }
};

export const deletePayrollItem = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    await prisma.payrollItem.delete({
      where: { id, companyId }
    });

    res.json({ message: "Élément supprimé" });
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la suppression", error: error.message });
  }
};
