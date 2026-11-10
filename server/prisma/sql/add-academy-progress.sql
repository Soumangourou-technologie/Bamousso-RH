BEGIN;

CREATE TABLE "public"."AcademyProgress" (
    "userId" TEXT NOT NULL REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "courseId" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("userId", "courseId", "activity")
);

ALTER TABLE "public"."AcademyProgress" ENABLE ROW LEVEL SECURITY;

COMMIT;
