-- Make event poster mandatory at application and database default level.
-- Column remains NOT NULL; we only remove automatic default fallback.
ALTER TABLE "Event"
ALTER COLUMN "poster" DROP DEFAULT;
