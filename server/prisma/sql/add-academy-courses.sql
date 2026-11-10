BEGIN;

CREATE TABLE "public"."AcademyCourse" (
    "id" TEXT PRIMARY KEY,
    "content" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

ALTER TABLE "public"."AcademyCourse" ENABLE ROW LEVEL SECURITY;

COMMIT;
