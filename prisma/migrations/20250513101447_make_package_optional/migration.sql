-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_packageId_fkey";

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "packageId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;
