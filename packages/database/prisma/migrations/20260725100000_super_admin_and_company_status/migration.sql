-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'super_admin';

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('active', 'inactive');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "status" "CompanyStatus" NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "company_id" DROP NOT NULL;
