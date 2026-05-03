-- Rename participation enum value to align new terminology
ALTER TYPE "ParticipationType" RENAME VALUE 'Collaboration' TO 'Volunteer';

-- External invitee catalog for non-registered users
CREATE TABLE "ExternalInvitee" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalInvitee_pkey" PRIMARY KEY ("id")
);

-- Invitation can target either a registered user or an external invitee
ALTER TABLE "Invitation"
ADD COLUMN "externalInviteeId" TEXT;

ALTER TABLE "Invitation"
ADD CONSTRAINT "Invitation_externalInviteeId_fkey"
FOREIGN KEY ("externalInviteeId") REFERENCES "ExternalInvitee"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- External invitees must provide exactly one contact channel
ALTER TABLE "ExternalInvitee"
ADD CONSTRAINT "ExternalInvitee_contact_xor_check"
CHECK (
    ("email" IS NOT NULL AND "phone" IS NULL)
    OR
    ("email" IS NULL AND "phone" IS NOT NULL)
);
