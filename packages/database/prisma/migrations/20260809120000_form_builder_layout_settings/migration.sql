-- Form builder: unified layout, settings, draft status
ALTER TYPE "RegistrationFormStatus" ADD VALUE IF NOT EXISTS 'draft';

ALTER TABLE "registration_forms" ADD COLUMN IF NOT EXISTS "field_layout" JSONB;
ALTER TABLE "registration_forms" ADD COLUMN IF NOT EXISTS "registration_limit" INTEGER;
ALTER TABLE "registration_forms" ADD COLUMN IF NOT EXISTS "redirect_url" TEXT;

-- Existing forms remain active/inactive; only schema default for new rows is draft.
