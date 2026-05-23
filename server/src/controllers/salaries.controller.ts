import { Response } from "express";
import prisma from "../utils/prisma.js";

export const getSalaries = async (req: any, res: Response) => {
  try {
    const user = req.user;
    
    // Récupérer les employés de l'entreprise avec leurs salaires
    const employees = await prisma.user.findMany({
      where: { 
        companyId: user.companyId,
        role: "EMPLOYEE"
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        baseSalary: true,
        bankDetails: true,
        jobTitle: true
      }
    });

    res.json(employees);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération des salaires", error: error.message });
  }
};

export const generatePayroll = async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { month, year } = req.body; // ex: 04, 2026

    const employees = await prisma.user.findMany({
      where: { 
        companyId: user.companyId,
        role: "EMPLOYEE",
        baseSalary: { gt: 0 }
      }
    });

    if (employees.length === 0) {
      return res.status(400).json({ message: "Aucun employé avec un salaire défini n'a été trouvé." });
    }

    const payslips = [];

    // Pour chaque employé, on crée un Document de type PAYSLIP
    // Note: Dans une version réelle, on générerait un PDF ici.
    for (const emp of employees) {
      const doc = await prisma.document.create({
        data: {
          title: `Fiche de Paie - ${month}/${year} - ${emp.firstName} ${emp.lastName}`,
          type: "PAYSLIP",
          url: `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`, // URL de démonstration
          employeeId: emp.id
        }
      });
      payslips.push(doc);

      // Notifier l'employé que sa fiche de paie est disponible
      await prisma.notification.create({
        data: {
          title: "Fiche de paie disponible",
          message: `Votre fiche de paie pour la période ${month}/${year} est maintenant disponible.`,
          type: "DOCUMENT",
          resourceId: doc.id,
          userId: emp.id,
          companyId: emp.companyId
        }
      });
    }

    res.status(201).json({ message: `${payslips.length} fiches de paie générées avec succès.`, data: payslips });
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la génération de la paie", error: error.message });
  }
};
