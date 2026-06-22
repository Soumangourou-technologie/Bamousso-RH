import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany();
  console.log("Companies:", companies.map(c => ({
    name: c.name,
    plan: c.plan,
    extraEmployees: c.extraEmployees,
    subscriptionEndsAt: c.subscriptionEndsAt
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
