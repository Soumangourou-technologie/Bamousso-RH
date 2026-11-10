BEGIN;

ALTER TABLE "public"."SupplierProfile" ADD COLUMN "featuredUntil" TIMESTAMP(3);

CREATE TABLE "public"."JobOffer" (
  "id" TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "title" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "published" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "JobOffer_published_createdAt_idx" ON "public"."JobOffer"("published", "createdAt");
CREATE INDEX "JobOffer_companyId_createdAt_idx" ON "public"."JobOffer"("companyId", "createdAt");

CREATE TABLE "public"."CandidateProfile" (
  "userId" TEXT PRIMARY KEY REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "headline" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "visible" BOOLEAN NOT NULL DEFAULT false,
  "cv" BYTEA
);
CREATE INDEX "CandidateProfile_visible_idx" ON "public"."CandidateProfile"("visible");
ALTER TABLE "public"."JobOffer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CandidateProfile" ENABLE ROW LEVEL SECURITY;

COMMIT;
