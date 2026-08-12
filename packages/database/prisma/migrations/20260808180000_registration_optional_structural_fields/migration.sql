-- Allow optional structural fields per RegistrationForm configuration
ALTER TABLE "Registration" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "Registration" ALTER COLUMN "category_id" DROP NOT NULL;
