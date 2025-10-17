-- CreateTable
CREATE TABLE "DrospectInspection" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "totalImages" INTEGER NOT NULL DEFAULT 0,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrospectInspection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DrospectInspection" ADD CONSTRAINT "DrospectInspection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
