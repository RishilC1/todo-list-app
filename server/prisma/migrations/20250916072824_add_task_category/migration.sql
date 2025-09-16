-- CreateEnum
CREATE TYPE "public"."Category" AS ENUM ('WORK', 'PERSONAL');

-- AlterTable
ALTER TABLE "public"."Task" ADD COLUMN     "category" "public"."Category" NOT NULL DEFAULT 'PERSONAL';
