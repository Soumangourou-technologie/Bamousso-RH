BEGIN;

CREATE TABLE "public"."DirectSupplierOrder" (
    "id" TEXT PRIMARY KEY,
    "buyerId" TEXT REFERENCES "public"."Company"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "supplierId" TEXT REFERENCES "public"."Company"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "buyerName" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
    "unitPrice" DECIMAL(14, 2) NOT NULL CHECK ("unitPrice" >= 0),
    "vatRate" DECIMAL(5, 2) NOT NULL CHECK ("vatRate" BETWEEN 0 AND 100),
    "total" DECIMAL(14, 2) NOT NULL CHECK ("total" >= 0),
    "deliveryAddress" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'CONFIRMED', 'DECLINED')),
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ("buyerId" <> "supplierId")
);

CREATE INDEX "DirectSupplierOrder_buyerId_createdAt_idx" ON "public"."DirectSupplierOrder" ("buyerId", "createdAt");
CREATE INDEX "DirectSupplierOrder_supplierId_createdAt_idx" ON "public"."DirectSupplierOrder" ("supplierId", "createdAt");
ALTER TABLE "public"."DirectSupplierOrder" ENABLE ROW LEVEL SECURITY;

COMMIT;
