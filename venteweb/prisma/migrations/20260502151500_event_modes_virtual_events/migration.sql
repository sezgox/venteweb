-- Move events from the legacy flat shape to mode-specific on-site/virtual tables.
-- This migration is intentionally idempotent because some local dev databases were
-- already pushed toward this schema outside Prisma migrations.

DO $$
BEGIN
  CREATE TYPE "EventMode" AS ENUM ('OnSite', 'Virtual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "onlyVirtual" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "OnSiteEvent" (
  "eventId" TEXT NOT NULL,
  "maxAttendees" INTEGER,
  "maxCollaborators" INTEGER,
  "lat" DOUBLE PRECISION NOT NULL,
  "lng" DOUBLE PRECISION NOT NULL,
  "location" TEXT NOT NULL,
  "locationAlias" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "requiresRequest" BOOLEAN NOT NULL DEFAULT false,
  "invitation" TEXT,
  "totalRate" DOUBLE PRECISION,
  "ratingCount" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "OnSiteEvent_pkey" PRIMARY KEY ("eventId")
);

INSERT INTO "OnSiteEvent" (
  "eventId",
  "maxAttendees",
  "maxCollaborators",
  "lat",
  "lng",
  "location",
  "locationAlias",
  "startDate",
  "endDate",
  "requiresRequest",
  "invitation",
  "totalRate",
  "ratingCount"
)
SELECT
  "id",
  "maxAttendees",
  "maxCollaborators",
  "lat",
  "lng",
  "location",
  "locationAlias",
  "startDate",
  "endDate",
  "requiresRequest",
  "invitation",
  "totalRate",
  "ratingCount"
FROM "Event"
WHERE
  "lat" IS NOT NULL
  AND "lng" IS NOT NULL
  AND "location" IS NOT NULL
  AND "startDate" IS NOT NULL
  AND "endDate" IS NOT NULL
ON CONFLICT ("eventId") DO UPDATE SET
  "maxAttendees" = EXCLUDED."maxAttendees",
  "maxCollaborators" = EXCLUDED."maxCollaborators",
  "lat" = EXCLUDED."lat",
  "lng" = EXCLUDED."lng",
  "location" = EXCLUDED."location",
  "locationAlias" = EXCLUDED."locationAlias",
  "startDate" = EXCLUDED."startDate",
  "endDate" = EXCLUDED."endDate",
  "requiresRequest" = EXCLUDED."requiresRequest",
  "invitation" = EXCLUDED."invitation",
  "totalRate" = EXCLUDED."totalRate",
  "ratingCount" = EXCLUDED."ratingCount";

CREATE TABLE IF NOT EXISTS "VirtualEvent" (
  "eventId" TEXT NOT NULL,
  "maxAttendees" INTEGER,
  "maxCollaborators" INTEGER,
  "requiresRequest" BOOLEAN NOT NULL DEFAULT false,
  "invitation" TEXT,
  "totalRate" DOUBLE PRECISION,
  "ratingCount" INTEGER NOT NULL DEFAULT 0,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VirtualEvent_pkey" PRIMARY KEY ("eventId")
);

CREATE TABLE IF NOT EXISTS "Platform" (
  "id" TEXT NOT NULL,
  "virtualEventId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "link" TEXT NOT NULL,
  CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Participation"
  ADD COLUMN IF NOT EXISTS "eventMode" "EventMode" NOT NULL DEFAULT 'OnSite';

ALTER TABLE "Rating"
  ADD COLUMN IF NOT EXISTS "eventMode" "EventMode" NOT NULL DEFAULT 'OnSite',
  ADD COLUMN IF NOT EXISTS "onSiteEventId" TEXT,
  ADD COLUMN IF NOT EXISTS "virtualEventId" TEXT;

ALTER TABLE "Request"
  ADD COLUMN IF NOT EXISTS "eventMode" "EventMode" NOT NULL DEFAULT 'OnSite',
  ADD COLUMN IF NOT EXISTS "onSiteEventId" TEXT,
  ADD COLUMN IF NOT EXISTS "virtualEventId" TEXT;

ALTER TABLE "Invitation"
  ADD COLUMN IF NOT EXISTS "eventMode" "EventMode" NOT NULL DEFAULT 'OnSite',
  ADD COLUMN IF NOT EXISTS "onSiteEventId" TEXT,
  ADD COLUMN IF NOT EXISTS "virtualEventId" TEXT;

UPDATE "Rating"
SET "onSiteEventId" = "eventId"
WHERE "eventMode" = 'OnSite' AND "onSiteEventId" IS NULL;

UPDATE "Request"
SET "onSiteEventId" = "eventId"
WHERE "eventMode" = 'OnSite' AND "onSiteEventId" IS NULL;

UPDATE "Invitation"
SET "onSiteEventId" = "eventId"
WHERE "eventMode" = 'OnSite' AND "onSiteEventId" IS NULL;

DROP INDEX IF EXISTS "Participation_userId_eventId_key";
DROP INDEX IF EXISTS "Participation_externalUserId_eventId_key";
DROP INDEX IF EXISTS "Rating_userId_eventId_key";
DROP INDEX IF EXISTS "Rating_eventId_idx";
DROP INDEX IF EXISTS "Rating_eventId_updatedAt_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "Participation_userId_eventId_eventMode_key"
  ON "Participation"("userId", "eventId", "eventMode");

CREATE UNIQUE INDEX IF NOT EXISTS "Participation_externalUserId_eventId_eventMode_key"
  ON "Participation"("externalUserId", "eventId", "eventMode");

CREATE INDEX IF NOT EXISTS "Participation_eventId_eventMode_idx"
  ON "Participation"("eventId", "eventMode");

CREATE UNIQUE INDEX IF NOT EXISTS "Rating_userId_eventId_eventMode_key"
  ON "Rating"("userId", "eventId", "eventMode");

CREATE INDEX IF NOT EXISTS "Rating_eventId_eventMode_idx"
  ON "Rating"("eventId", "eventMode");

CREATE INDEX IF NOT EXISTS "Rating_eventId_eventMode_updatedAt_idx"
  ON "Rating"("eventId", "eventMode", "updatedAt");

CREATE INDEX IF NOT EXISTS "Platform_virtualEventId_idx"
  ON "Platform"("virtualEventId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OnSiteEvent_eventId_fkey'
  ) THEN
    ALTER TABLE "OnSiteEvent"
      ADD CONSTRAINT "OnSiteEvent_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'VirtualEvent_eventId_fkey'
  ) THEN
    ALTER TABLE "VirtualEvent"
      ADD CONSTRAINT "VirtualEvent_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Platform_virtualEventId_fkey'
  ) THEN
    ALTER TABLE "Platform"
      ADD CONSTRAINT "Platform_virtualEventId_fkey"
      FOREIGN KEY ("virtualEventId") REFERENCES "VirtualEvent"("eventId") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Rating_onSiteEventId_fkey'
  ) THEN
    ALTER TABLE "Rating"
      ADD CONSTRAINT "Rating_onSiteEventId_fkey"
      FOREIGN KEY ("onSiteEventId") REFERENCES "OnSiteEvent"("eventId") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Rating_virtualEventId_fkey'
  ) THEN
    ALTER TABLE "Rating"
      ADD CONSTRAINT "Rating_virtualEventId_fkey"
      FOREIGN KEY ("virtualEventId") REFERENCES "VirtualEvent"("eventId") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Request_onSiteEventId_fkey'
  ) THEN
    ALTER TABLE "Request"
      ADD CONSTRAINT "Request_onSiteEventId_fkey"
      FOREIGN KEY ("onSiteEventId") REFERENCES "OnSiteEvent"("eventId") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Request_virtualEventId_fkey'
  ) THEN
    ALTER TABLE "Request"
      ADD CONSTRAINT "Request_virtualEventId_fkey"
      FOREIGN KEY ("virtualEventId") REFERENCES "VirtualEvent"("eventId") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Invitation_onSiteEventId_fkey'
  ) THEN
    ALTER TABLE "Invitation"
      ADD CONSTRAINT "Invitation_onSiteEventId_fkey"
      FOREIGN KEY ("onSiteEventId") REFERENCES "OnSiteEvent"("eventId") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Invitation_virtualEventId_fkey'
  ) THEN
    ALTER TABLE "Invitation"
      ADD CONSTRAINT "Invitation_virtualEventId_fkey"
      FOREIGN KEY ("virtualEventId") REFERENCES "VirtualEvent"("eventId") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Event"
  DROP COLUMN IF EXISTS "maxAttendees",
  DROP COLUMN IF EXISTS "maxCollaborators",
  DROP COLUMN IF EXISTS "lat",
  DROP COLUMN IF EXISTS "lng",
  DROP COLUMN IF EXISTS "location",
  DROP COLUMN IF EXISTS "locationAlias",
  DROP COLUMN IF EXISTS "startDate",
  DROP COLUMN IF EXISTS "endDate",
  DROP COLUMN IF EXISTS "requiresRequest",
  DROP COLUMN IF EXISTS "totalRate",
  DROP COLUMN IF EXISTS "ratingCount",
  DROP COLUMN IF EXISTS "invitation";
