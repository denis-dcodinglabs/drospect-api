-- AlterTable
ALTER TABLE "ThermalProcessingTask" ADD COLUMN     "bounds" JSONB,
ADD COLUMN     "cogCreatedAt" TIMESTAMP(3),
ADD COLUMN     "cogUrl" TEXT,
ADD COLUMN     "maxZoom" INTEGER,
ADD COLUMN     "minZoom" INTEGER,
ADD COLUMN     "tileServiceUrl" TEXT;
