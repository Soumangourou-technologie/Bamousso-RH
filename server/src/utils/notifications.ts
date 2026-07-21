import prisma from "./prisma.js";

export const createNotification = async (data: {
  title: string;
  message: string;
  type?: string;
  resourceId?: string;
  userId?: string;
  companyId?: string;
}) => {
  try {
    let finalCompanyId = data.companyId;

    // Si le companyId est absent mais qu'on a un userId, on va le chercher
    if (!finalCompanyId && data.userId) {
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { companyId: true }
      });
      if (user) finalCompanyId = user.companyId || undefined;
    }

    const notification = await prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type,
        resourceId: data.resourceId,
        userId: data.userId,
        companyId: finalCompanyId,
      },
    });
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
};

/**
 * Notifie tous les administrateurs d'une entreprise
 */
export const notifyAdmins = async (companyId: string, title: string, message: string, type?: string, resourceId?: string, targetRole?: "COMPANY_ADMIN" | "HR") => {
  try {
    let roleFilter: any = { in: ["COMPANY_ADMIN", "HR_MANAGER", "HR_ASSISTANT", "RH", "COMMERCIAL"] };
    if (targetRole === "COMPANY_ADMIN") {
      roleFilter = "COMPANY_ADMIN";
    } else if (targetRole === "HR") {
      roleFilter = { in: ["HR_MANAGER", "HR_ASSISTANT", "RH"] };
    }

    const admins = await prisma.user.findMany({
      where: {
        companyId,
        role: roleFilter
      },
      select: { id: true }
    });

    const notifications = await Promise.all(
      admins.map(admin => 
        prisma.notification.create({
          data: {
            title,
            message,
            type,
            resourceId,
            userId: admin.id,
            companyId
          }
        })
      )
    );
    return notifications;
  } catch (error) {
    console.error("Error notifying admins:", error);
    return [];
  }
};
