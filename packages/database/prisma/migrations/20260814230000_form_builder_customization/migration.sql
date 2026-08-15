-- Form builder customization: slug, appearance, public copy
ALTER TABLE "registration_forms" ADD COLUMN "slug" TEXT;
ALTER TABLE "registration_forms" ADD COLUMN "appearance" JSONB;
ALTER TABLE "registration_forms" ADD COLUMN "success_message" TEXT;
ALTER TABLE "registration_forms" ADD COLUMN "public_title" TEXT;
ALTER TABLE "registration_forms" ADD COLUMN "public_description" TEXT;
ALTER TABLE "registration_forms" ADD COLUMN "submit_button_text" TEXT;

CREATE UNIQUE INDEX "registration_forms_slug_key" ON "registration_forms"("slug");
