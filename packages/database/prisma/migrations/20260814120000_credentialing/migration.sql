-- AlterTable
ALTER TABLE "AccessPoint" ADD COLUMN "public_id" TEXT;
ALTER TABLE "AccessPoint" ADD COLUMN "allows_all_categories" BOOLEAN NOT NULL DEFAULT true;

-- Backfill public_id for existing rows
UPDATE "AccessPoint"
SET "public_id" = substr(replace(gen_random_uuid()::text, '-', ''), 1, 32)
WHERE "public_id" IS NULL;

ALTER TABLE "AccessPoint" ALTER COLUMN "public_id" SET NOT NULL;
CREATE UNIQUE INDEX "AccessPoint_public_id_key" ON "AccessPoint"("public_id");

-- Existing points with specific categories should not allow all
UPDATE "AccessPoint" AS ap
SET "allows_all_categories" = false
WHERE EXISTS (
  SELECT 1 FROM "AccessPointCategory" apc WHERE apc.access_point_id = ap.id
);

-- AlterTable
ALTER TABLE "CheckIn" ADD COLUMN "access_point_id" TEXT;

ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_access_point_id_fkey"
  FOREIGN KEY ("access_point_id") REFERENCES "AccessPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "registration_forms" ADD COLUMN "default_category_id" TEXT;

ALTER TABLE "registration_forms" ADD CONSTRAINT "registration_forms_default_category_id_fkey"
  FOREIGN KEY ("default_category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
