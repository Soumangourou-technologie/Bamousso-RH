BEGIN;

CREATE TABLE "public"."SupplierQuote" (
    "id" TEXT PRIMARY KEY,
    "buyerId" TEXT REFERENCES "public"."Company"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "supplierId" TEXT REFERENCES "public"."Company"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "buyerName" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "need" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
    "location" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED'
        CHECK ("status" IN ('REQUESTED', 'QUOTED', 'ACCEPTED', 'DECLINED')),
    "totalFcfa" INTEGER CHECK ("totalFcfa" > 0),
    "terms" TEXT,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CHECK ("buyerId" <> "supplierId")
);

CREATE INDEX "SupplierQuote_buyerId_createdAt_idx" ON "public"."SupplierQuote" ("buyerId", "createdAt");
CREATE INDEX "SupplierQuote_supplierId_createdAt_idx" ON "public"."SupplierQuote" ("supplierId", "createdAt");

CREATE TABLE "public"."SupplierOrder" (
    "id" TEXT PRIMARY KEY,
    "quoteId" TEXT NOT NULL UNIQUE REFERENCES "public"."SupplierQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "public"."SupplierQuote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SupplierOrder" ENABLE ROW LEVEL SECURITY;

COMMIT;
