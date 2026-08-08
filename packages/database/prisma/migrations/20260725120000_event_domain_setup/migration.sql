-- AlterTable
ALTER TABLE "Event" ADD COLUMN "image_url" TEXT;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "description" TEXT;

-- CreateEnum
CREATE TYPE "RegistrationLinkFormMode" AS ENUM ('shared', 'own');

-- CreateTable
CREATE TABLE "RegistrationLink" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "default_category_id" TEXT,
    "form_mode" "RegistrationLinkFormMode" NOT NULL DEFAULT 'shared',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessPoint" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessPointCategory" (
    "access_point_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "AccessPointCategory_pkey" PRIMARY KEY ("access_point_id","category_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationLink_event_id_slug_key" ON "RegistrationLink"("event_id", "slug");

-- AddForeignKey
ALTER TABLE "RegistrationLink" ADD CONSTRAINT "RegistrationLink_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationLink" ADD CONSTRAINT "RegistrationLink_default_category_id_fkey" FOREIGN KEY ("default_category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessPoint" ADD CONSTRAINT "AccessPoint_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessPointCategory" ADD CONSTRAINT "AccessPointCategory_access_point_id_fkey" FOREIGN KEY ("access_point_id") REFERENCES "AccessPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessPointCategory" ADD CONSTRAINT "AccessPointCategory_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
