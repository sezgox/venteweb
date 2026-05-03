-- Make poster optional again. Frontend handles default image rendering.
ALTER TABLE "Event"
ALTER COLUMN "poster" DROP NOT NULL;
