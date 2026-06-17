import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage de la génération de notifications de bienvenue...');

  const users = await prisma.user.findMany({
    include: { company: true }
  });

  if (users.length === 0) {
    console.log('⚠️ Aucun utilisateur trouvé pour générer des notifications.');
    return;
  }

  console.log(`👤 ${users.length} utilisateurs trouvés. Création des notifications...`);

  for (const user of users) {
    // Notification de Bienvenue personnalisée
    await prisma.notification.create({
      data: {
        title: "Bienvenue sur Bamousso RH 🎉",
        message: `Bonjour ${user.firstName}, votre espace de travail ${user.company?.name || 'Bamousso'} est prêt et configuré ! Profitez d'une gestion simplifiée en temps réel.`,
        type: "ANNOUNCEMENT",
        userId: user.id,
        companyId: user.companyId || null,
        read: false
      }
    });

    // Notification spécifique au rôle
    if (user.role === "SUPER_ADMIN") {
      await prisma.notification.create({
        data: {
          title: "Système Opérationnel 🛡️",
          message: "Toutes les bases de données, les tunnels de paiement GeniusPay et les configurations d'envoi d'emails Resend sont 100% validés en production.",
          type: "SYSTEM",
          userId: user.id,
          companyId: null,
          read: false
        }
      });
    } else if (user.role === "COMPANY_ADMIN") {
      await prisma.notification.create({
        data: {
          title: "Formule Active 💳",
          message: `Votre formule ${user.company?.plan || 'FITINI'} est bien active. Le temps restant est visible en direct sur votre tableau de bord !`,
          type: "BILLING",
          userId: user.id,
          companyId: user.companyId,
          read: false
        }
      });
    }
  }

  console.log('🎉 Génération terminée ! Les cloches de notifications de tous les utilisateurs vont s\'allumer !');
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
