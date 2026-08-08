-- AlterEnum
ALTER TYPE "FieldType" ADD VALUE 'textarea';
ALTER TYPE "FieldType" ADD VALUE 'checkbox';
ALTER TYPE "FieldType" ADD VALUE 'date';

-- AlterTable
ALTER TABLE "FormField" ADD COLUMN "placeholder" TEXT;

-- DropForeignKey
ALTER TABLE "FormField" DROP CONSTRAINT "FormField_event_id_fkey";

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
