import { Response } from "express"; 
 import prisma from "../utils/prisma.js"; 
 import { z } from "zod"; 
 import type { AuthRequest } from "../middleware/auth.js"; 
 import { createNotification, notifyAdmins } from "../utils/notifications.js";
 
 const createTaskSchema = z.object({ 
   title: z.string().min(1, "Le titre de la tâche est requis"), 
   description: z.string().optional(), 
   status: z.enum(["A_FAIRE", "EN_COURS", "TERMINEE"]).optional(), 
   dueDate: z.coerce.date().optional(), 
   assignedToId: z.string().uuid("ID utilisateur assigné invalide").optional().nullable(), 
 }); 
 
 const updateTaskSchema = z.object({ 
   title: z.string().min(1, "Le titre de la tâche est requis").optional(), 
   description: z.string().optional(), 
   status: z.enum(["A_FAIRE", "EN_COURS", "TERMINEE"]).optional(), 
   dueDate: z.coerce.date().optional().nullable(), 
   assignedToId: z.string().uuid("ID utilisateur assigné invalide").optional().nullable(), 
 }); 
 
 export const getTasks = async (req: AuthRequest, res: Response) => { 
   try { 
     const user = req.user; 
     if (!user) return res.status(401).json({ message: "Non authentifié." }); 
 
     const whereClause: Record<string, any> = {}; 
 
     if (user.role !== "SUPER_ADMIN") { 
       whereClause.companyId = user.companyId; 
     } 
 
     if (req.query.companyId && typeof req.query.companyId === "string") { 
       whereClause.companyId = req.query.companyId; 
     } 
 
     const validStatus = ["A_FAIRE", "EN_COURS", "TERMINEE"]; 
     if ( 
       req.query.status && 
       typeof req.query.status === "string" && 
       validStatus.includes(req.query.status) 
     ) { 
       whereClause.status = req.query.status; 
     } 
 
     if (req.query.assignedToMe === "true") { 
       whereClause.assignedToId = user.id; 
     } else if ( 
       req.query.assignedToId && 
       typeof req.query.assignedToId === "string" 
     ) { 
       whereClause.assignedToId = req.query.assignedToId; 
     } 
 
     const tasks = await prisma.task.findMany({ 
       where: whereClause, 
       include: { 
         assignedTo: { 
           select: { id: true, firstName: true, lastName: true, email: true }, 
         }, 
         creator: { 
           select: { id: true, firstName: true, lastName: true, email: true }, 
         }, 
       }, 
       orderBy: { createdAt: "desc" }, 
     }); 
 
     res.json(tasks); 
   } catch (error: any) { 
     res.status(500).json({ 
       message: "Erreur lors de la récupération des tâches", 
       error: error.message, 
     }); 
   } 
 }; 
 
 export const createTask = async (req: AuthRequest, res: Response) => { 
   try { 
     const { title, description, status, dueDate, assignedToId } = 
       createTaskSchema.parse(req.body); 
 
     const user = req.user; 
     if (!user) return res.status(401).json({ message: "Non authentifié." }); 
     if (!user.companyId) 
       return res 
         .status(400) 
         .json({ message: "Utilisateur non rattaché à une entreprise." }); 
 
     // 🔒 Vérification sécurité assignation 
     if (assignedToId) { 
       const userExists = await prisma.user.findUnique({ 
         where: { id: assignedToId }, 
       }); 
 
       if (!userExists || userExists.companyId !== user.companyId) { 
         return res.status(400).json({ 
           message: "Utilisateur assigné invalide", 
         }); 
       } 
     } 
 
     const newTask = await prisma.task.create({ 
       data: { 
         title, 
         description, 
         status: status || "A_FAIRE", 
         dueDate, 
         companyId: user.companyId, 
         createdBy: user.id, 
         assignedToId, 
       }, 
     }); 
 
     // Notifier l'employé assigné
     if (assignedToId) {
       await createNotification({
         title: "Nouvelle tâche assignée",
         message: `Vous avez reçu une nouvelle tâche : ${title}`,
         userId: assignedToId
       });
     }
 
     res.status(201).json(newTask); 
   } catch (error: any) { 
     if (error instanceof z.ZodError) { 
       return res.status(400).json({ 
         message: "Données invalides", 
         errors: error.issues, 
       }); 
     } 
 
     res.status(500).json({ 
       message: "Erreur lors de la création de la tâche", 
       error: error.message, 
     }); 
   } 
 }; 
 
 export const updateTask = async (req: AuthRequest, res: Response) => { 
   try { 
     const { id } = req.params; 
 
     if (typeof id !== "string") { 
       return res.status(400).json({ message: "ID de tâche invalide." }); 
     } 
 
     const { title, description, status, dueDate, assignedToId } = 
       updateTaskSchema.parse(req.body); 
 
     const user = req.user; 
     if (!user) return res.status(401).json({ message: "Non authentifié." }); 
 
     const existingTask = await prisma.task.findUnique({ where: { id } }); 
     if (!existingTask) 
       return res.status(404).json({ message: "Tâche non trouvée." }); 
 
     if ( 
       user.role !== "SUPER_ADMIN" && 
       existingTask.companyId !== user.companyId 
     ) { 
       return res 
         .status(403) 
         .json({ message: "Non autorisé à modifier cette tâche." }); 
     } 
 
     const canModify = 
       user.id === existingTask.createdBy || 
       user.id === existingTask.assignedToId ||
       user.role === "COMPANY_ADMIN" || 
       user.role === "SUPER_ADMIN"; 
 
     if (!canModify) { 
       return res.status(403).json({ 
         message: "Vous n'êtes pas autorisé à modifier cette tâche.", 
       }); 
     } 
 
     const updatedTask = await prisma.task.update({ 
       where: { id: id as string }, 
       data: { 
         ...(title !== undefined && { title }), 
         ...(description !== undefined && { description }), 
         ...(status !== undefined && { status }), 
         ...(dueDate !== undefined && { dueDate }), 
         ...(assignedToId !== undefined && { assignedToId }), 
       }, 
     }); 

     // Notifier l'employé s'il a été assigné à cette tâche
     if (assignedToId && assignedToId !== existingTask.assignedToId) {
       await createNotification({
         title: "Nouvelle tâche assignée",
         message: `Vous avez été assigné à la tâche : ${updatedTask.title}`,
         userId: assignedToId
       });
     }

     res.json(updatedTask); 
   } catch (error: any) { 
     if (error instanceof z.ZodError) { 
       return res.status(400).json({ 
         message: "Données invalides", 
         errors: error.issues, 
       }); 
     } 
 
     res.status(500).json({ 
       message: "Erreur lors de la mise à jour de la tâche", 
       error: error.message, 
     }); 
   } 
 }; 
 
 export const deleteTask = async (req: AuthRequest, res: Response) => { 
   try { 
     const { id } = req.params; 
 
     const user = req.user; 
     if (!user) return res.status(401).json({ message: "Non authentifié." }); 
 
     const existingTask = await prisma.task.findUnique({ where: { id: id as string } }); 
     if (!existingTask) 
       return res.status(404).json({ message: "Tâche non trouvée." }); 
 
     if ( 
       user.role !== "SUPER_ADMIN" && 
       existingTask.companyId !== user.companyId 
     ) { 
       return res 
         .status(403) 
         .json({ message: "Non autorisé à supprimer cette tâche." }); 
     } 
 
     const canDelete = 
       user.id === existingTask.createdBy || 
       user.role === "COMPANY_ADMIN" || 
       user.role === "SUPER_ADMIN"; 
 
     if (!canDelete) { 
       return res.status(403).json({ 
         message: "Vous n'êtes pas autorisé à supprimer cette tâche.", 
       }); 
     } 
 
     await prisma.task.delete({ where: { id: id as string } }); 
 
     res.status(200).json({ message: "Tâche supprimée avec succès." }); 
   } catch (error: any) { 
     res.status(500).json({ 
       message: "Erreur lors de la suppression de la tâche", 
       error: error.message, 
     }); 
   } 
 };