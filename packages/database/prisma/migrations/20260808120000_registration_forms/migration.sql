-- CreateEnum
CREATE TYPE "RegistrationFormStatus" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "registration_forms" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "status" "RegistrationFormStatus" NOT NULL DEFAULT 'active',
    "structural_config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_forms_pkey" PRIMARY KEY ("id")
);

-- Create default form per event and migrate existing form fields
INSERT INTO "registration_forms" ("id", "event_id", "name", "public_id", "status", "structural_config", "created_at", "updated_at")
SELECT
    gen_random_uuid()::text,
    e."id",
    'Formulário principal',
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
    'active'::"RegistrationFormStatus",
    '{"name":{"enabled":true,"required":true},"email":{"enabled":true,"required":true},"phone":{"enabled":true,"required":false},"cpf":{"enabled":false,"required":false},"category":{"enabled":true,"required":true}}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Event" e;

-- Add registration_form_id to FormField
ALTER TABLE "FormField" ADD COLUMN "registration_form_id" TEXT;

UPDATE "FormField" ff
SET "registration_form_id" = rf."id"
FROM "registration_forms" rf
WHERE rf."event_id" = ff."event_id"
  AND rf."name" = 'Formulário principal';

-- Remove orphaned form fields without a form (should not happen)
DELETE FROM "FormField" WHERE "registration_form_id" IS NULL;

ALTER TABLE "FormField" DROP CONSTRAINT "FormField_event_id_fkey";
ALTER TABLE "FormField" DROP COLUMN "event_id";
ALTER TABLE "FormField" ALTER COLUMN "registration_form_id" SET NOT NULL;

-- Add registration_form_id to Registration
ALTER TABLE "Registration" ADD COLUMN "registration_form_id" TEXT;

-- DropFormField FK and add new ones
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_registration_form_id_fkey" FOREIGN KEY ("registration_form_id") REFERENCES "registration_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registration_forms" ADD CONSTRAINT "registration_forms_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "registration_forms_public_id_key" ON "registration_forms"("public_id");
CREATE INDEX "registration_forms_event_id_idx" ON "registration_forms"("event_id");
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_registration_form_id_fkey" FOREIGN KEY ("registration_form_id") REFERENCES "registration_forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Registration_registration_form_id_idx" ON "Registration"("registration_form_id");
