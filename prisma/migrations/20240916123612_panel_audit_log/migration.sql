-- CreateTable
CREATE TABLE "PanelAuditLog" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "totalImages" INTEGER NOT NULL DEFAULT 0,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PanelAuditLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PanelAuditLog" ADD CONSTRAINT "PanelAuditLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
