-- AlterTable
ALTER TABLE "ExternalUser" RENAME CONSTRAINT "ExternalInvitee_pkey" TO "ExternalUser_pkey";

-- CreateIndex
CREATE INDEX "ExternalUser_email_idx" ON "ExternalUser"("email");

-- CreateIndex
CREATE INDEX "ExternalUser_phone_idx" ON "ExternalUser"("phone");
