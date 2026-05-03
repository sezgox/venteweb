ALTER TABLE "User"
ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "activatedAt" TIMESTAMP(3),
ADD COLUMN "firebaseUid" TEXT;

UPDATE "User"
SET "activatedAt" = COALESCE("lastLogin", "createdAt")
WHERE "active" = true AND "activatedAt" IS NULL;

CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");
