/*
  Warnings:

  - Added the required column `cep` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `number` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `street` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "accent_color" TEXT NOT NULL DEFAULT '#00C896',
ADD COLUMN     "banner_color" TEXT NOT NULL DEFAULT '#0B1F3A',
ADD COLUMN     "cep" TEXT NOT NULL,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "complement" TEXT,
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "number" TEXT NOT NULL,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "street" TEXT NOT NULL,
ADD COLUMN     "welcome_message" TEXT;
