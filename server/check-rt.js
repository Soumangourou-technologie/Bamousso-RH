import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    console.log("Enabling real-time for Notification...");
    await prisma.$executeRawUnsafe(`ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";`);
    console.log("Success! Real-time enabled for Notification.");
  } catch (e) {
    if (e.message.includes("already exists") || e.message.includes("is already in publication")) {
      console.log("Table is already in publication.");
    } else {
      console.error(e);
    }
  } finally {
    await prisma.$disconnect();
  }
}
main();
