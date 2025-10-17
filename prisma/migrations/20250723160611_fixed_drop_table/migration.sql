/*
  Warnings:

  - You are about to alter the column `processingEfficiency` on the `DrospectInspection` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `DoublePrecision`.

*/
-- AlterTable
ALTER TABLE "DrospectInspection" ALTER COLUMN "processingEfficiency" SET DATA TYPE DOUBLE PRECISION;
