-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailSent" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User" SET "emailSent" = true WHERE "active" = true;
