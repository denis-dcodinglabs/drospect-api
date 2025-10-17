/*
  Warnings:

  - Added the required column `status` to the `DrospectInspection` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DrospectInspection" ADD COLUMN     "limit" INTEGER,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "page" INTEGER,
ADD COLUMN     "status" TEXT NOT NULL;
