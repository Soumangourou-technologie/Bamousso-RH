import { Response } from "express";
import prisma from "../utils/prisma.js";
import { startOfMonth, endOfMonth, parseISO, differenceInMinutes, getDaysInMonth } from "date-fns";

export const getSalaries = async (req: any, res: Response) => {
  try {
    const user = req.user;
    
    // Récupérer les employés avec infos de paie
    const employees = await prisma.user.findMany({
      where: { 
        companyId: user.companyId,
        role: { notIn: ["SUPER_ADMIN", "COMPANY_ADMIN"] }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        baseSalary: true,
        hourlyRate: true,
        dailyRate: true,
        paymentMethod: true,
        bankDetails: true,
        jobTitle: true,
        workSchedule: { select: { name: true, hoursPerWeek: true, hoursPerDay: true } }
      }
    });

    res.json(employees);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération des salaires", error: error.message });
  }
};

export const getPayslips = async (req: any, res: Response) => {
  try {
    const payslips = await prisma.payslip.findMany({
      where: { companyId: req.user.companyId },
      include: { employee: { select: { firstName: true, lastName: true, jobTitle: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(payslips);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération des fiches de paie", error: error.message });
  }
};

export const generatePayroll = async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { month, year } = req.body; // ex: 4, 2026

    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = endOfMonth(periodStart);
    const daysInMonth = getDaysInMonth(periodStart);

    // Get Company config
    const company = await prisma.company.findUnique({
      where: { id: user.companyId }
    });

    if (!company) return res.status(404).json({ message: "Entreprise introuvable" });

    // Get all employees
    const employees = await prisma.user.findMany({
      where: { 
        companyId: user.companyId,
        role: { notIn: ["SUPER_ADMIN", "COMPANY_ADMIN"] }
      },
      include: {
        workSchedule: true,
        payrollItems: true, // Specific bonuses
        attendances: {
          where: {
            date: { gte: periodStart, lte: periodEnd }
          }
        },
        approvedLeaves: {
          where: {
            status: "APPROVED",
            startDate: { lte: periodEnd },
            endDate: { gte: periodStart }
          }
        }
      }
    });

    // Get company wide bonuses
    const companyBonuses = await prisma.payrollItem.findMany({
      where: { companyId: user.companyId, employeeId: null }
    });

    if (employees.length === 0) {
      return res.status(400).json({ message: "Aucun employé éligible n'a été trouvé." });
    }

    const generatedPayslips = [];

    for (const emp of employees) {
      // 1. Calcul du temps de travail réel
      let totalMinutesWorked = 0;
      let daysWorked = 0;

      for (const att of emp.attendances) {
        if (att.checkIn && att.checkOut) {
          totalMinutesWorked += differenceInMinutes(att.checkOut, att.checkIn);
          daysWorked++;
        } else if (att.status === "PRESENT" && !att.checkOut && emp.workSchedule) {
          // Fallback: si l'employé est PRESENT mais n'a pas check-out, on suppose une journée normale
          totalMinutesWorked += emp.workSchedule.hoursPerDay * 60;
          daysWorked++;
        }
      }

      let hoursWorked = totalMinutesWorked / 60;
      if (emp.workSchedule) {
        // Enlever les pauses si le calcul par minute les inclut
        // (simplification: on suppose que checkIn/Out inclut la pause)
      }

      // 2. Calcul des congés (simplifié: tout ce qui touche le mois)
      let paidLeaveDays = 0;
      let unpaidLeaveDays = 0;
      for (const leave of emp.approvedLeaves) {
        // Calculer l'intersection des dates
        const start = leave.startDate > periodStart ? leave.startDate : periodStart;
        const end = leave.endDate < periodEnd ? leave.endDate : periodEnd;
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
        
        if (leave.type === "PAID" || leave.type === "SICK" || leave.type === "MATERNITY") {
          paidLeaveDays += diffDays;
        } else {
          unpaidLeaveDays += diffDays;
        }
      }

      // 3. Calcul du salaire de base selon le mode
      let calculatedBaseSalary = 0;
      let paymentMethod = emp.paymentMethod || "MONTHLY";
      
      if (paymentMethod === "MONTHLY") {
        calculatedBaseSalary = emp.baseSalary || 0;
        // Déduction proportionnelle pour les jours non payés
        if (unpaidLeaveDays > 0) {
          const dailyRate = calculatedBaseSalary / daysInMonth;
          calculatedBaseSalary -= (unpaidLeaveDays * dailyRate);
        }
      } else if (paymentMethod === "HOURLY") {
        calculatedBaseSalary = (emp.hourlyRate || 0) * hoursWorked;
      } else if (paymentMethod === "DAILY") {
        calculatedBaseSalary = (emp.dailyRate || 0) * (daysWorked + paidLeaveDays);
      } else { // HYBRID
        calculatedBaseSalary = emp.baseSalary || 0;
      }

      // 4. Heures supplémentaires
      let overtimeHours = 0;
      let overtimeAmount = 0;
      if (emp.workSchedule) {
        const standardHoursInMonth = (emp.workSchedule.hoursPerWeek / 5) * (daysWorked + paidLeaveDays);
        if (hoursWorked > standardHoursInMonth) {
          overtimeHours = hoursWorked - standardHoursInMonth;
          // Simplification : tout à 125%
          const hourlyRate = emp.hourlyRate || (emp.baseSalary ? (emp.baseSalary / (emp.workSchedule.hoursPerWeek * 4)) : 0);
          overtimeAmount = overtimeHours * hourlyRate * (company.overtimeRate125 || 1.25);
        }
      }

      // 5. Primes et Déductions
      let bonusAmount = 0;
      let deductionAmount = 0;
      
      const allItems = [...companyBonuses, ...emp.payrollItems];
      for (const item of allItems) {
        if (!item.isMonthly) continue; // Simplification: ne prend que les récurrents ou il faudrait un lien avec le mois
        
        let amount = 0;
        if (item.amountType === "PERCENTAGE") {
          amount = calculatedBaseSalary * (item.amount / 100);
        } else {
          amount = item.amount;
        }

        if (item.type === "BONUS") {
          bonusAmount += amount;
        } else {
          deductionAmount += amount;
        }
      }

      // 6. Total Net
      const netSalary = calculatedBaseSalary + overtimeAmount + bonusAmount - deductionAmount;

      // 7. Enregistrer Payslip
      const payslip = await prisma.payslip.create({
        data: {
          periodStart,
          periodEnd,
          paymentMethod,
          baseSalary: calculatedBaseSalary,
          daysWorked,
          hoursWorked,
          overtimeHours,
          paidLeaveDays,
          unpaidLeaveDays,
          overtimeAmount,
          bonusAmount,
          deductionAmount,
          netSalary,
          employeeId: emp.id,
          companyId: user.companyId,
          status: "VALIDATED",
          pdfUrl: `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`
        }
      });

      generatedPayslips.push(payslip);

      // Notification
      await prisma.notification.create({
        data: {
          title: "Fiche de paie disponible",
          message: `Votre paie de ${netSalary.toFixed(2)} FCFA pour la période ${month}/${year} a été générée.`,
          type: "DOCUMENT",
          userId: emp.id,
          companyId: user.companyId
        }
      });
    }

    res.status(201).json({ message: `${generatedPayslips.length} fiches de paie calculées et générées avec succès.`, data: generatedPayslips });
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la génération de la paie", error: error.message });
  }
};
