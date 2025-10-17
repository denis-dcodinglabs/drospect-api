-- Add image statistics fields to DrospectInspection table
ALTER TABLE "DrospectInspection" ADD COLUMN "rgbImages" INTEGER;
ALTER TABLE "DrospectInspection" ADD COLUMN "thermalImages" INTEGER;
ALTER TABLE "DrospectInspection" ADD COLUMN "healthyImages" INTEGER;
ALTER TABLE "DrospectInspection" ADD COLUMN "unhealthyImages" INTEGER;
ALTER TABLE "DrospectInspection" ADD COLUMN "processedImages" INTEGER;
ALTER TABLE "DrospectInspection" ADD COLUMN "processingDetails" TEXT;
ALTER TABLE "DrospectInspection" ADD COLUMN "errorMessage" TEXT;
ALTER TABLE "DrospectInspection" ADD COLUMN "processingEfficiency" DECIMAL(5,2); -- Stores percentage like 98.50% 