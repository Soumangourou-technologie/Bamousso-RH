import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tablesToEnable = [
  'Notification',
  'Suggestion',
  'User',
  'Attendance',
  'Message',
  'LeaveRequest',
  'SupportChatMessage',
  'SupportChatRoom',
  'SupportTicketMessage',
  'Task',
  'Department'
];

async function main() {
  console.log('🚀 Démarrage de l\'activation du Temps Réel Supabase...');

  try {
    // S'assurer que la publication supabase_realtime existe
    console.log('🔍 Vérification de la publication "supabase_realtime"...');
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
          CREATE PUBLICATION supabase_realtime;
        END IF;
      END $$;
    `);
    console.log('✅ Publication "supabase_realtime" validée.');
  } catch (err) {
    console.error('❌ Erreur lors de la vérification de la publication:', err);
  }

  for (const table of tablesToEnable) {
    try {
      console.log(`📡 Tentative d'activation de la réplication pour la table "${table}"...`);
      
      // Ajoute la table à la publication Supabase Realtime (avec double guillemets pour respecter la casse Prisma)
      await prisma.$executeRawUnsafe(`
        ALTER PUBLICATION supabase_realtime ADD TABLE "${table}";
      `);
      
      console.log(`🎉 Table "${table}" ajoutée avec succès au temps réel !`);
    } catch (err: any) {
      if (err.message && err.message.includes('already exists in publication')) {
        console.log(`ℹ️ La table "${table}" est déjà activée pour le temps réel.`);
      } else {
        console.warn("⚠️ Impossible d'ajouter la table \"%s\" :", table, err.message || err);
      }
    }
  }

  console.log('🏁 Opération terminée ! Toutes les tables transactional ont été configurées pour le temps réel.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
