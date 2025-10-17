import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma.service";
import { GcsUploadService } from "../googleStorage/storage.service";
import { NodeOdmService } from "./nodeodm.service";
import { ThermalProcessingService } from "./thermal-processing.service";

@Injectable()
export class OrthoStarterScheduler {
  private readonly logger = new Logger(OrthoStarterScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gcsUploadService: GcsUploadService,
    private readonly nodeOdmService: NodeOdmService,
    private readonly thermalProcessingService: ThermalProcessingService,
  ) {}

  // Every 30 seconds, try to start queued tasks whose ZIP is ready
  @Cron(CronExpression.EVERY_30_SECONDS)
  async startQueuedTasks(): Promise<void> {
    try {
      if (process.env.RUN_CRON === "false") {
        return;
      }

      // Find the most recent queued task (you can batch if desired)
      const task = await this.prisma.thermalProcessingTask.findFirst({
        where: { status: "queued" },
        orderBy: { createdAt: "desc" },
      });

      if (!task) {
        return;
      }

      // Atomically claim the task
      const claimed = await this.prisma.thermalProcessingTask.updateMany({
        where: { id: task.id, status: "queued" },
        data: { status: "starting", updatedAt: new Date() },
      });

      if (claimed.count !== 1) {
        return; // someone else claimed
      }

      const bucketName = process.env.GCS_BUCKET_NAME || "drospect-bucket";
      const zipStatus = await this.gcsUploadService.getZipStatus(
        bucketName,
        task.projectId,
        `${task.projectId}.zip`,
      );

      if (zipStatus.status === "completed") {
        const zipUrl = `https://storage.googleapis.com/${bucketName}/${task.projectId}/${task.projectId}.zip`;
        try {
          await this.nodeOdmService.createTaskFromZipUrl(
            zipUrl,
            (task.nodeOdmOptions as any) || {},
            task.id,
          );
          await this.prisma.thermalProcessingTask.update({
            where: { id: task.id },
            data: { status: "pending", updatedAt: new Date() },
          });
          this.logger.log(`Started NodeODM for task ${task.id}`);
        } catch (e: any) {
          await this.prisma.thermalProcessingTask.update({
            where: { id: task.id },
            data: {
              status: "failed",
              errorMessage: `Failed to start NodeODM: ${e?.message || e}`,
              updatedAt: new Date(),
            },
          });
          this.logger.error(`Failed to start NodeODM for ${task.id}:`, e);
          // Refund on scheduler start failure (idempotent)
          try {
            await this.thermalProcessingService.refundTaskCreditsById(
              task.id,
              `Scheduler start failure: ${e?.message || e}`,
            );
          } catch (refundError) {
            this.logger.error(
              `Refund attempt failed in scheduler for ${task.id}: ${
                (refundError as any)?.message || refundError
              }`,
            );
          }
        }
      } else if (zipStatus.status === "pending") {
        // Try to start ZIP now
        this.gcsUploadService
          .zipAndUpload(bucketName, `${task.projectId}.zip`, task.projectId)
          .catch((e) => this.logger.error(`Failed to trigger zip: ${e}`));
        // Revert to queued to re-check later
        await this.prisma.thermalProcessingTask.update({
          where: { id: task.id },
          data: { status: "queued", updatedAt: new Date() },
        });
      } else {
        // in_progress → revert to queued for next cycle
        await this.prisma.thermalProcessingTask.update({
          where: { id: task.id },
          data: { status: "queued", updatedAt: new Date() },
        });
      }
    } catch (error) {
      this.logger.error(`Auto-starter error: ${error?.message || error}`);
    }
  }
}
