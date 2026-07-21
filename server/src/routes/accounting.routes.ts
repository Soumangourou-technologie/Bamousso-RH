import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware de vérification des droits d'accès à la compta
const checkAccountingAccess = (req: any, res: any, next: any) => {
  const allowedRoles = ['COMPANY_ADMIN', 'HR_MANAGER', 'HR_ASSISTANT', 'RH', 'COMPTABLE', 'SUPER_ADMIN'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Accès refusé. Rôle non autorisé pour la comptabilité.' });
  }
  next();
};

// ==========================================
// --- TRANSACTIONS (FLUX DE TRÉSORERIE) ---
// ==========================================

// Obtenir toutes les transactions de l'entreprise
router.get('/transactions', authenticate, checkAccountingAccess, async (req: any, res: any) => {
  try {
    const transactions = await prisma.companyTransaction.findMany({
      where: { companyId: req.user.companyId },
      orderBy: { date: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des transactions', error });
  }
});

// Ajouter une transaction
router.post('/transactions', authenticate, checkAccountingAccess, async (req: any, res: any) => {
  try {
    const { title, amount, type, category, reference, description, date } = req.body;
    
    if (!title || !amount || !type || !category) {
      return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis' });
    }

    const transaction = await prisma.companyTransaction.create({
      data: {
        title,
        amount: parseFloat(amount),
        type,
        category,
        reference,
        description,
        date: date ? new Date(date) : undefined,
        companyId: req.user.companyId
      }
    });
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création de la transaction', error });
  }
});

// ==========================================
// --- NOTES DE FRAIS (EXPENSES)          ---
// ==========================================

// Obtenir toutes les notes de frais (Admin/Comptable voit tout)
router.get('/expenses', authenticate, async (req: any, res: any) => {
  try {
    // Si l'utilisateur est un simple employé, il ne voit que ses notes
    const isAccounting = ['COMPANY_ADMIN', 'HR_MANAGER', 'HR_ASSISTANT', 'RH', 'COMPTABLE', 'SUPER_ADMIN'].includes(req.user.role);
    
    const expenses = await prisma.expenseReport.findMany({
      where: { 
        companyId: req.user.companyId,
        ...(isAccounting ? {} : { employeeId: req.user.id })
      },
      include: {
        employee: { select: { firstName: true, lastName: true, jobTitle: true } },
        approvedBy: { select: { firstName: true, lastName: true } }
      },
      orderBy: { date: 'desc' }
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des notes de frais', error });
  }
});

// Soumettre une nouvelle note de frais (N'importe quel employé)
router.post('/expenses', authenticate, async (req: any, res: any) => {
  try {
    const { title, amount, category, description, date, receiptUrl } = req.body;
    
    if (!title || !amount) {
      return res.status(400).json({ message: 'Le titre et le montant sont obligatoires' });
    }

    const expense = await prisma.expenseReport.create({
      data: {
        title,
        amount: parseFloat(amount),
        category: category || 'AUTRE',
        description,
        date: date ? new Date(date) : undefined,
        receiptUrl,
        employeeId: req.user.id,
        companyId: req.user.companyId
      }
    });
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création de la note de frais', error });
  }
});

// Mettre à jour le statut d'une note de frais (Comptable/Admin uniquement)
router.patch('/expenses/:id/status', authenticate, checkAccountingAccess, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // APPROVED, REJECTED, PAID

    const expense = await prisma.expenseReport.findFirst({
      where: { id, companyId: req.user.companyId }
    });

    if (!expense) return res.status(404).json({ message: 'Note de frais introuvable' });

    const updatedExpense = await prisma.expenseReport.update({
      where: { id },
      data: { 
        status,
        approvedById: req.user.id
      }
    });

    // Si on marque comme payée, on peut optionnellement générer une transaction automatique
    if (status === 'PAID') {
      await prisma.companyTransaction.create({
        data: {
          title: `Remboursement NDF : ${expense.title}`,
          amount: expense.amount,
          type: 'EXPENSE',
          category: 'Remboursement Frais',
          reference: `NDF-${expense.id.substring(0, 8)}`,
          companyId: req.user.companyId
        }
      });
    }

    res.json(updatedExpense);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la note de frais', error });
  }
});

// ==========================================
// --- STATISTIQUES (TABLEAU DE BORD)     ---
// ==========================================
router.get('/stats', authenticate, checkAccountingAccess, async (req: any, res: any) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Entrées du mois
    const incomes = await prisma.companyTransaction.aggregate({
      where: {
        companyId: req.user.companyId,
        type: 'INCOME',
        date: { gte: startOfMonth }
      },
      _sum: { amount: true }
    });

    // Sorties du mois
    const expenses = await prisma.companyTransaction.aggregate({
      where: {
        companyId: req.user.companyId,
        type: 'EXPENSE',
        date: { gte: startOfMonth }
      },
      _sum: { amount: true }
    });

    // Notes de frais en attente
    const pendingExpenses = await prisma.expenseReport.count({
      where: {
        companyId: req.user.companyId,
        status: 'PENDING'
      }
    });

    res.json({
      monthIncome: incomes._sum.amount || 0,
      monthExpense: expenses._sum.amount || 0,
      pendingExpenseReports: pendingExpenses
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques', error });
  }
});

export default router;
