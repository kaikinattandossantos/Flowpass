-- AlterTable
ALTER TABLE "registration_forms" ADD COLUMN "published_appearance" JSONB;

-- Backfill: existing saved appearance becomes the published version
UPDATE "registration_forms"
SET "published_appearance" = "appearance"
WHERE "appearance" IS NOT NULL;
