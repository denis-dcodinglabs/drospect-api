-- Change NUMERIC(5,2) to DOUBLE PRECISION
ALTER TABLE "DrospectInspection"
  ALTER COLUMN "processingEfficiency" TYPE DOUBLE PRECISION
  USING "processingEfficiency"::DOUBLE PRECISION;