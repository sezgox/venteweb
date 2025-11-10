/*
  Warnings:

  - You are about to drop the column `location` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "locationAlias" TEXT;

-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "locationAlias" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "location",
ADD COLUMN     "locale" TEXT;
