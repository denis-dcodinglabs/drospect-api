/*
  Warnings:

  - You are about to drop the column `counter` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "counter",
ADD COLUMN     "imagecounter" INTEGER;
