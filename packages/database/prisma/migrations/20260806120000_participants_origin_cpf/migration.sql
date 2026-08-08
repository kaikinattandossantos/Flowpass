-- CreateEnum
CREATE TYPE "RegistrationOrigin" AS ENUM ('MANUAL', 'IMPORT', 'PUBLIC_FORM');

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN "cpf" TEXT;
ALTER TABLE "Registration" ADD COLUMN "origin" "RegistrationOrigin" NOT NULL DEFAULT 'PUBLIC_FORM';

-- CreateIndex
CREATE INDEX "Registration_event_id_email_idx" ON "Registration"("event_id", "email");
CREATE INDEX "Registration_event_id_cpf_idx" ON "Registration"("event_id", "cpf");
