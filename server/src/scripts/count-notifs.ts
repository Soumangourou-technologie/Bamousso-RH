import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.notification.count();
  console.log('📊 Total des notifications en base:', total);
  
  if (total > 0) {
    const sample = await prisma.notification.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    });
    console.log('🔍 10 Dernières Notifications:', JSON.stringify(sample, null, 2));
  }
}

main().finally(() => prisma.$disconnect());
