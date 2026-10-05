-- AlterEnum
ALTER TYPE "RegistrationMethod" ADD VALUE 'EXTERNAL_LINK';

-- AlterTable
ALTER TABLE "events" ADD COLUMN "external_url" VARCHAR(500);
