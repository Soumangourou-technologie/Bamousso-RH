BEGIN;

ALTER TABLE "public"."Product"
    ADD COLUMN "directoryPublished" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "directoryPriceOnQuote" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "directoryImageUrl" TEXT;

COMMIT;
