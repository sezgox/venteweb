DROP INDEX IF EXISTS "ExternalUser_email_key";
DROP INDEX IF EXISTS "ExternalUser_phone_key";

CREATE UNIQUE INDEX IF NOT EXISTS "ExternalUser_email_not_null_key"
ON "ExternalUser"("email")
WHERE "email" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "ExternalUser_phone_not_null_key"
ON "ExternalUser"("phone")
WHERE "phone" IS NOT NULL;
