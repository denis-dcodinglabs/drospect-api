-- CreateTable
CREATE TABLE "ThermalProcessingTask" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "taskUuid" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "imagesCount" INTEGER NOT NULL DEFAULT 0,
    "nodeOdmOptions" JSONB,
    "resultUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThermalProcessingTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ThermalProcessingTask_taskUuid_key" ON "ThermalProcessingTask"("taskUuid");

-- AddForeignKey
ALTER TABLE "ThermalProcessingTask" ADD CONSTRAINT "ThermalProcessingTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
