import { Response } from "express"; 
import bcrypt from "bcryptjs"; 
import prisma from "../utils/prisma.js"; 
import { z } from "zod"; 
import type { AuthRequest } from "../middleware/auth.js"; 

// ======================= 
// SCHEMAS 
// ======================= 

const createUserSchema = z.object({ 
  email: z.string().email(), 
  password: z.string().min(6).optional(), 
  firstName: z.string(), 
  lastName: z.string(), 
  role: z.enum([ 
    "SUPER_ADMIN", 
    "COMPANY_ADMIN", 
    "HR_MANAGER", 
    "COMMERCIAL", 
    "LIVREUR",
    "EMPLOYEE", 
  ]), 
  companyId: z.string().optional(), 
  jobTitle: z.string().optional(), 
  phone: z.string().optional(), 
  hireDate: z.coerce.date().optional(), 
  status: z.enum(["INVITED", "ACTIVE", "INACTIVE"]).optional(), 
  departmentId: z.string().optional(), 
  customRoleId: z.string().optional(), 
  managerId: z.string().optional(), 
  baseSalary: z.number().optional(),
  salaryCurrency: z.string().optional(),
  bankDetails: z.string().optional(),
}); 

const updateUserSchema = createUserSchema.partial(); 

// ======================= 
// CREATE USER 
// ======================= 

export const createUser = async (req: AuthRequest, res: Response) => { 
  try { 
    const data = createUserSchema.parse(req.body); 
    const currentUser = req.user; 

    if (!currentUser) return res.status(401).json({ message: "Unauthorized" }); 

    if (currentUser.role === "COMMERCIAL" && data.role !== "EMPLOYEE") { 
      return res.status(403).json({ 
        message: "Le profil Commercial ne peut créer que des employés.", 
      }); 
    } 

    const existingUser = await prisma.user.findUnique({ 
      where: { email: data.email }, 
    }); 

    if (existingUser) { 
      return res.status(400).json({ message: "User already exists" }); 
    } 

    if (currentUser.role === "SUPER_ADMIN" && !data.companyId) { 
      return res.status(400).json({ 
        message: "companyId requis pour SUPER_ADMIN", 
      }); 
    } 

    const rawPassword = 
      data.password && data.password.length >= 6 
        ? data.password 
        : Math.random().toString(36).slice(2) + 
          Math.random().toString(36).slice(2); 

    const hashedPassword = await bcrypt.hash(rawPassword, 10); 

    const targetCompanyId = 
      currentUser.role === "SUPER_ADMIN" 
        ? data.companyId 
        : currentUser.companyId; 

    if ( 
      currentUser.role !== "SUPER_ADMIN" && 
      data.companyId && 
      data.companyId !== currentUser.companyId 
    ) { 
      return res.status(403).json({ 
        message: "Impossible de créer pour une autre entreprise.", 
      }); 
    } 

    const user = await prisma.user.create({ 
      data: { 
        email: data.email, 
        password: hashedPassword, 
        firstName: data.firstName, 
        lastName: data.lastName, 
        role: data.role, 
        companyId: targetCompanyId, 
        jobTitle: data.jobTitle || null, 
        phone: data.phone || null, 
        hireDate: data.hireDate || null, 
        status: data.status || "INVITED", 
        departmentId: data.departmentId || null, 
        customRoleId: data.customRoleId || null, 
        managerId: data.managerId || null, 
        baseSalary: data.baseSalary || null,
        bankDetails: data.bankDetails || null,
      }, 
    }); 

    res.status(201).json({ id: user.id, email: user.email }); 
  } catch (error: any) { 
    if (error instanceof z.ZodError) { 
      return res.status(400).json({ message: "Données invalides", errors: error.issues }); 
    } 

    res.status(500).json({ message: "Erreur création utilisateur", error: error.message }); 
  } 
}; 

// ======================= 
// GET USERS 
// ======================= 

export const getUsers = async (req: AuthRequest, res: Response) => { 
  try { 
    const currentUser = req.user; 
    if (!currentUser) return res.status(401).json({ message: "Non authentifié." }); 

    const role = req.query.role as string;
    const companyId = req.query.companyId as string;
    const departmentId = req.query.departmentId as string;

    const validRoles = [
      "SUPER_ADMIN",
      "COMPANY_ADMIN",
      "HR_MANAGER",
      "COMMERCIAL",
      "LIVREUR",
      "EMPLOYEE",
    ];

    const whereClause: Record<string, any> = {};

    if (role) {
      if (Array.isArray(role)) {
        whereClause.role = { in: role.filter(r => validRoles.includes(r)) };
      } else if (validRoles.includes(role)) {
        whereClause.role = role;
      }
    }

    if (departmentId) {
      whereClause.departmentId = departmentId as string;
    }

    if (currentUser.role === "SUPER_ADMIN") {
      if (companyId) {
        whereClause.companyId = companyId as string;
      } 
    } else { 
      if (!currentUser.companyId) { 
        return res.status(400).json({ message: "Pas d'entreprise liée." }); 
      } 

      whereClause.companyId = currentUser.companyId as string; 
      whereClause.NOT = { role: "SUPER_ADMIN" }; 
    } 

    const users = await prisma.user.findMany({ 
      where: whereClause, 
      select: { 
        id: true, 
        email: true, 
        firstName: true, 
        lastName: true, 
        role: true, 
        jobTitle: true, 
        phone: true, 
        hireDate: true, 
        status: true, 
        departmentId: true, 
        department: {
          select: { id: true, name: true }
        },
        customRoleId: true,
        customRole: {
          select: { id: true, name: true }
        },
        managerId: true, 
        baseSalary: true,
        salaryCurrency: true,
        bankDetails: true,
      }, 
    }); 

    res.json(users); 
  } catch (error: any) { 
    res.status(500).json({ message: "Erreur récupération utilisateurs", error: error.message }); 
  } 
}; 

// ======================= 
// UPDATE USER 
// ======================= 

export const updateUser = async (req: AuthRequest, res: Response) => { 
  try { 
    const { id } = req.params; 
    if (!id) return res.status(400).json({ message: "ID manquant" }); 

    const currentUser = req.user; 
    if (!currentUser) return res.status(401).json({ message: "Unauthorized" }); 

    const data = updateUserSchema.parse(req.body); 

    const whereClause: any = { id: id as string };
    if (currentUser.role !== "SUPER_ADMIN") {
      whereClause.companyId = currentUser.companyId;
    }

    const targetUser = await prisma.user.findFirst({ where: whereClause }); 
    if (!targetUser) return res.status(404).json({ message: "Utilisateur non trouvé ou accès refusé" }); 

    const updateData: Record<string, any> = { 
      ...(data.firstName !== undefined && { firstName: data.firstName }), 
      ...(data.lastName !== undefined && { lastName: data.lastName }), 
      ...(data.jobTitle !== undefined && { jobTitle: data.jobTitle }), 
      ...(data.phone !== undefined && { phone: data.phone }), 
      ...(data.hireDate !== undefined && { hireDate: data.hireDate }), 
      ...(data.status !== undefined && { status: data.status }), 
      ...(data.departmentId !== undefined && { departmentId: data.departmentId }), 
      ...(data.customRoleId !== undefined && { customRoleId: data.customRoleId }), 
      ...(data.managerId !== undefined && { managerId: data.managerId }), 
      ...(data.baseSalary !== undefined && { baseSalary: data.baseSalary }),
      ...(req.body.salaryCurrency !== undefined && { salaryCurrency: req.body.salaryCurrency }),
      ...(data.bankDetails !== undefined && { bankDetails: data.bankDetails }),
    }; 

    // Seul un SUPER_ADMIN peut changer l'email, le rôle ou l'entreprise d'un utilisateur
    if (currentUser.role === "SUPER_ADMIN") {
      if (data.email !== undefined) updateData.email = data.email;
      if (data.role !== undefined) updateData.role = data.role;
      if (data.companyId !== undefined) updateData.companyId = data.companyId;
    } else if (data.role !== undefined || data.companyId !== undefined || data.email !== undefined) {
        if (data.role && ["HR_MANAGER", "COMMERCIAL", "LIVREUR", "EMPLOYEE"].includes(data.role)) {
           updateData.role = data.role;
        } else if (data.role) {
           return res.status(403).json({ message: "Action non autorisée : vous ne pouvez pas attribuer ce rôle." });
        }
        
        if (data.email && data.email !== targetUser.email) {
           return res.status(403).json({ message: "Action non autorisée : seul le super administrateur peut changer l'email principal." });
        }
    }

    if (data.password) { 
      updateData.password = await bcrypt.hash(data.password, 10); 
    } 

    const updatedUser = await prisma.user.update({ 
      where: { id: id as string }, 
      data: updateData, 
    }); 

    res.json(updatedUser); 
  } catch (error: any) { 
    if (error instanceof z.ZodError) { 
      return res.status(400).json({ message: "Données invalides", errors: error.issues }); 
    } 

    res.status(500).json({ message: "Erreur update utilisateur", error: error.message }); 
  } 
}; 

// ======================= 
// UPDATE PASSWORD 
// ======================= 

export const updateUserPassword = async (req: AuthRequest, res: Response) => { 
  try { 
    const { id } = req.params; 
    const currentUser = req.user;
    if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

    const whereClause: any = { id: id as string };
    if (currentUser.role !== "SUPER_ADMIN") {
      whereClause.companyId = currentUser.companyId;
    }

    const targetUser = await prisma.user.findFirst({ where: whereClause });
    if (!targetUser) return res.status(404).json({ message: "Utilisateur non trouvé ou accès refusé" });

    const { password } = z.object({ password: z.string().min(6) }).parse(req.body); 

    const hashedPassword = await bcrypt.hash(password, 10); 
    await prisma.user.update({ 
      where: { id: id as string }, 
      data: { password: hashedPassword }, 
    }); 

    res.json({ message: "Mot de passe mis à jour" }); 
  } catch (error: any) { 
    res.status(500).json({ message: "Erreur mise à jour mot de passe", error: error.message }); 
  } 
}; 

// ======================= 
// SUSPEND / ACTIVATE 
// ======================= 

export const suspendUser = async (req: AuthRequest, res: Response) => { 
  try { 
    const { id } = req.params; 
    const currentUser = req.user;
    if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

    const whereClause: any = { id: id as string };
    if (currentUser.role !== "SUPER_ADMIN") {
      whereClause.companyId = currentUser.companyId;
    }

    const targetUser = await prisma.user.findFirst({ where: whereClause });
    if (!targetUser) return res.status(404).json({ message: "Utilisateur non trouvé ou accès refusé" });

    await prisma.user.update({ 
      where: { id: id as string }, 
      data: { status: "INACTIVE" }, 
    }); 
    res.json({ message: "Utilisateur suspendu" }); 
  } catch (error: any) { 
    res.status(500).json({ message: "Erreur suspension", error: error.message }); 
  } 
}; 

export const activateUser = async (req: AuthRequest, res: Response) => { 
  try { 
    const { id } = req.params; 
    const currentUser = req.user;
    if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

    const whereClause: any = { id: id as string };
    if (currentUser.role !== "SUPER_ADMIN") {
      whereClause.companyId = currentUser.companyId;
    }

    const targetUser = await prisma.user.findFirst({ where: whereClause });
    if (!targetUser) return res.status(404).json({ message: "Utilisateur non trouvé ou accès refusé" });

    await prisma.user.update({ 
      where: { id: id as string }, 
      data: { status: "ACTIVE" }, 
    }); 
    res.json({ message: "Utilisateur activé" }); 
  } catch (error: any) { 
    res.status(500).json({ message: "Erreur activation", error: error.message }); 
  } 
}; 

// ======================= 
// DELETE USER 
// ======================= 

export const deleteUser = async (req: AuthRequest, res: Response) => { 
  try { 
    const { id } = req.params; 
    const currentUser = req.user; 

    if (!currentUser) return res.status(401).json({ message: "Unauthorized" }); 
    if (!id) return res.status(400).json({ message: "ID manquant" }); 

    if (currentUser.id === id) { 
      return res.status(403).json({ message: "Auto-suppression interdite" }); 
    } 

    const whereClause: any = { id: id as string };
    if (currentUser.role !== "SUPER_ADMIN") {
      whereClause.companyId = currentUser.companyId;
    }

    const targetUser = await prisma.user.findFirst({ where: whereClause });
    if (!targetUser) return res.status(404).json({ message: "Utilisateur non trouvé ou accès refusé" });

    await prisma.user.delete({ where: { id: id as string } }); 

    res.json({ message: "Utilisateur supprimé" }); 
  } catch (error: any) { 
    res.status(500).json({ message: "Erreur suppression", error: error.message }); 
  } 
};