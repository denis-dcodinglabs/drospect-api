-- CreateTable
CREATE TABLE "PanelStatistics" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "totalImages" INTEGER NOT NULL DEFAULT 0,
    "healthyPanels" INTEGER NOT NULL DEFAULT 0,
    "unhealthyPanels" INTEGER NOT NULL DEFAULT 0,
    "inspectedPanels" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PanelStatistics_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PanelStatistics" ADD CONSTRAINT "PanelStatistics_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
