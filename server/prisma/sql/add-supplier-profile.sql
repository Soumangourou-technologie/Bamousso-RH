BEGIN;

CREATE TABLE "public"."SupplierProfile" (
    "companyId" TEXT PRIMARY KEY REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "sector" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false
);

-- Express accesses the table through Prisma. The Data API has no policies on it.
ALTER TABLE "public"."SupplierProfile" ENABLE ROW LEVEL SECURITY;

COMMIT;
