/*
  Warnings:

  - You are about to drop the column `taskUuid` on the `ThermalProcessingTask` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ThermalProcessingTask_taskUuid_key";

-- AlterTable
ALTER TABLE "ThermalProcessingTask" DROP COLUMN "taskUuid";
