import { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { uploadToSupabase } from "../utils/supabase.js";

export const createAnnouncement = async (req: Request, res: Response): Promise<any> => {
  try {
    const { title, content, category } = req.body;
    const authorId = (req as any).user.id;
    const file = (req as any).file;

    let fileUrl: string | null = null;
    let fileType: string | null = null;

    // Upload fichier si présent
    if (file) {
      fileUrl = await uploadToSupabase(file);
      fileType = file.mimetype;
    }

    const post = await prisma.forumPost.create({
      data: {
        title,
        content,
        category: category || "ANNOUNCEMENT",
        authorId,
        fileUrl: fileUrl || undefined,
        fileType: fileType || undefined,
      },
      include: { author: true }
    });

    // Créer une notification pour toute l'entreprise
    await prisma.notification.create({
      data: {
        title: `Nouvelle annonce : ${title}`,
        message: content.substring(0, 100) + (content.length > 100 ? "..." : ""),
        type: "ANNOUNCEMENT",
        resourceId: post.id,
        companyId: post.author.companyId,
      }
    });

    res.status(201).json(post);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

export const getAnnouncements = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    
    // Tout le monde dans l'entreprise voit les annonces
    const posts = await prisma.forumPost.findMany({
      where: {
        author: { companyId: user.companyId }
      },
      include: { 
        author: { select: { firstName: true, lastName: true, jobTitle: true, role: true } },
        comments: { include: { author: { select: { firstName: true, lastName: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(posts);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

export const createComment = async (req: Request, res: Response): Promise<any> => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const authorId = (req as any).user.id;

    if (!content) {
      return res.status(400).json({ message: "Le contenu du commentaire est requis." });
    }

    const comment = await prisma.forumComment.create({
      data: {
        content,
        postId: postId as string,
        authorId
      },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json(comment);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};
