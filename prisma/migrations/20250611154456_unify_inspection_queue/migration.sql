/*
  Warnings:

  - You are about to drop the `ScopitoInspection` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DrospectInspection" DROP CONSTRAINT "DrospectInspection_projectId_fkey";

-- AlterTable
ALTER TABLE "DrospectInspection" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "inspecting" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "modelType" INTEGER,
ADD COLUMN     "scopitoProjectId" INTEGER,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'DROSPECT',
ADD COLUMN     "startedAt" TIMESTAMP(3),
ALTER COLUMN "projectId" DROP NOT NULL;


-- AddForeignKey
ALTER TABLE "DrospectInspection" ADD CONSTRAINT "DrospectInspection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
