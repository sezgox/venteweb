UPDATE "ExternalUser"
SET "email" = NULL
WHERE "email" = '';

UPDATE "ExternalUser"
SET "phone" = NULL
WHERE "phone" = '';
