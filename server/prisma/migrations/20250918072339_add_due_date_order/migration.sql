-- AlterTable
ALTER TABLE "public"."Task" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;
