import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  
  if (!email || !password) {
    console.error('Missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD in environment');
    return;
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log(`Creating Super Admin: ${email}...`);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      password: hashedPassword,
    },
    create: {
      email,
      password: hashedPassword,
      firstName: 'Stephane Kevin',
      lastName: 'Assamoi',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log("Super Admin created/updated successfully:", user.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
