-- Rename external invitee domain to external user
ALTER TABLE "ExternalInvitee" RENAME TO "ExternalUser";
ALTER TABLE "Invitation" RENAME COLUMN "externalInviteeId" TO "externalUserId";

-- Replace old check constraint name/domain if present
ALTER TABLE "ExternalUser" DROP CONSTRAINT IF EXISTS "ExternalInvitee_contact_xor_check";

-- Keep unique identity channels for external users
CREATE UNIQUE INDEX IF NOT EXISTS "ExternalUser_email_key" ON "ExternalUser"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "ExternalUser_phone_key" ON "ExternalUser"("phone");

-- Participation can now be linked to external users
ALTER TABLE "Participation" ADD COLUMN IF NOT EXISTS "externalUserId" TEXT;
ALTER TABLE "Participation"
ADD CONSTRAINT "Participation_externalUserId_fkey"
FOREIGN KEY ("externalUserId") REFERENCES "ExternalUser"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "Participation_externalUserId_eventId_key" ON "Participation"("externalUserId", "eventId");

-- Update invitation foreign key naming to external user
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'Invitation'
      AND constraint_name = 'Invitation_externalInviteeId_fkey'
  ) THEN
    ALTER TABLE "Invitation" RENAME CONSTRAINT "Invitation_externalInviteeId_fkey" TO "Invitation_externalUserId_fkey";
  END IF;
END $$;
