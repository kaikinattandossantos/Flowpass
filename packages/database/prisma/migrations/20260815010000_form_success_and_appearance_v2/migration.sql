-- Post-registration behavior fields
CREATE TYPE "SuccessBehavior" AS ENUM ('message', 'message_redirect', 'redirect');

ALTER TABLE "registration_forms" ADD COLUMN "success_behavior" "SuccessBehavior" NOT NULL DEFAULT 'message';
ALTER TABLE "registration_forms" ADD COLUMN "success_title" TEXT;
ALTER TABLE "registration_forms" ADD COLUMN "redirect_delay" INTEGER;

-- Preserve existing redirect_url forms as immediate redirect
UPDATE "registration_forms"
SET "success_behavior" = 'redirect'
WHERE "redirect_url" IS NOT NULL;
