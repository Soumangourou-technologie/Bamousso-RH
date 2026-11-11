import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function transactionPoolerUrl(value: string | undefined): string | undefined {
  if (!value || !URL.canParse(value)) return undefined;

  const url = new URL(value);
  if (url.port !== "6543" || !url.hostname.endsWith(".pooler.supabase.com")) {
    return undefined;
  }

  // Supavisor transaction mode cannot share Prisma's named prepared statements.
  url.searchParams.set("pgbouncer", "true");
  return url.href;
}

const poolerUrl = transactionPoolerUrl(process.env.DATABASE_URL);
const prisma = globalForPrisma.prisma ?? new PrismaClient(
  poolerUrl ? { datasourceUrl: poolerUrl } : undefined,
);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
