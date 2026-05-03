ALTER TABLE "Event"
ADD COLUMN IF NOT EXISTS "ratingCount" INTEGER NOT NULL DEFAULT 0;

DELETE FROM "Rating"
WHERE "score" IS NULL
   OR "score" < 1
   OR "score" > 5
   OR "userId" IS NULL;

ALTER TABLE "Rating"
ALTER COLUMN "score" TYPE INTEGER USING ROUND("score")::INTEGER,
ALTER COLUMN "score" SET NOT NULL,
ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "Rating"
ADD CONSTRAINT "Rating_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Rating"
ADD CONSTRAINT "Rating_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Rating_eventId_idx" ON "Rating"("eventId");
CREATE INDEX IF NOT EXISTS "Rating_eventId_updatedAt_idx" ON "Rating"("eventId", "updatedAt");

UPDATE "Event" e
SET
  "totalRate" = aggregated.avg_score,
  "ratingCount" = aggregated.rating_count
FROM (
  SELECT "eventId", AVG("score")::double precision AS avg_score, COUNT(*)::integer AS rating_count
  FROM "Rating"
  GROUP BY "eventId"
) aggregated
WHERE e."id" = aggregated."eventId";

UPDATE "Event"
SET "totalRate" = NULL, "ratingCount" = 0
WHERE "id" NOT IN (SELECT DISTINCT "eventId" FROM "Rating");
