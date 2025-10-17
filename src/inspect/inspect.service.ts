import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { ImageService } from "../images/image.service";
import { callApi } from "src/helpers/python-api-trigger-helper";
import { MailService } from "../helpers/mail-helper";
import { UserService } from "../users/user.service";
import { ProjectService } from "../project/project.service";

@Injectable()
export class InspectService {
  private readonly logger = new Logger(InspectService.name);

  constructor(
    private prisma: PrismaService,
    private imageService: ImageService,
    private mailService: MailService,
    private userService: UserService,
    @Inject(forwardRef(() => ProjectService))
    private projectService: ProjectService,
  ) {}

  async isJobRunning(): Promise<boolean> {
    try {
      const runningJob = await this.prisma.drospectInspection.findFirst({
        where: {
          status: "running",
        },
      });
      return !!runningJob;
    } catch (error) {
      this.logger.error(`Error checking running job: ${error.message}`);
      throw new HttpException(
        { message: "Failed to check job status" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createJob(
    projectId: number,
    model: string,
    page: number,
    limit: number,
  ): Promise<number> {
    try {
      // First verify the project exists
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new HttpException(
          { message: `Project with ID ${projectId} not found` },
          HttpStatus.NOT_FOUND,
        );
      }

      const job = await this.prisma.drospectInspection.create({
        data: {
          projectId,
          source: "DROSPECT",
          status: "pending",
          model: model.toUpperCase(),
          page,
          limit,
          action: "inspect",
          totalImages: limit,
        },
      });
      this.logger.log(
        `Created DROSPECT inspection job ${job.id} for project ${projectId} with altitude ${model}`,
      );
      return job.id;
    } catch (error) {
      this.logger.error(`Error creating job: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { message: "Failed to create inspection job" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createScopitoJob(
    scopitoProjectId: number,
    modelType: number,
  ): Promise<number> {
    try {
      const model = modelType === 74 ? "HIGH" : "LOW";

      const job = await this.prisma.drospectInspection.create({
        data: {
          scopitoProjectId,
          source: "SCOPITO",
          status: "pending",
          model: model,
          modelType,
          action: "inspect",
          inspecting: true,
          totalImages: 0, // Scopito doesn't track image count the same way
        },
      });

      this.logger.log(
        `Created SCOPITO inspection job ${job.id} for project ${scopitoProjectId} with model type ${modelType}`,
      );
      return job.id;
    } catch (error) {
      this.logger.error(`Error creating Scopito job: ${error.message}`);
      throw new HttpException(
        { message: "Failed to create Scopito inspection job" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateJobStatus(
    jobId: number,
    status: "running" | "completed" | "failed",
  ): Promise<void> {
    try {
      // First verify the job exists
      const job = await this.prisma.drospectInspection.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new HttpException(
          { message: `Job with ID ${jobId} not found` },
          HttpStatus.NOT_FOUND,
        );
      }

      const updateData: any = { status };

      // Add timestamps for Scopito jobs
      if (job.source === "SCOPITO") {
        if (status === "running") {
          updateData.startedAt = new Date();
        } else if (status === "completed" || status === "failed") {
          updateData.completedAt = new Date();
        }
      }

      await this.prisma.drospectInspection.update({
        where: { id: jobId },
        data: updateData,
      });

      this.logger.log(`Updated ${job.source} job ${jobId} status to ${status}`);
    } catch (error) {
      this.logger.error(`Error updating job status: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { message: "Failed to update job status" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getNextPendingJob(): Promise<{
    id: number;
    projectId: number;
    model: string;
    limit: number;
  } | null> {
    try {
      return await this.prisma.drospectInspection.findFirst({
        where: {
          status: "pending",
        },
        orderBy: {
          createdAt: "asc",
        },
      });
    } catch (error) {
      this.logger.error(`Error getting next pending job: ${error.message}`);
      throw new HttpException(
        { message: "Failed to get next pending job" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAndLockNextJob(): Promise<{
    id: number;
    projectId: number;
    model: string;
    limit: number;
  } | null> {
    try {
      // Use a transaction to atomically get and lock the next job
      return await this.prisma.$transaction(async (prisma) => {
        // Check if there are any running jobs
        const runningJob = await prisma.drospectInspection.findFirst({
          where: { status: "running" },
        });

        if (runningJob) {
          this.logger.log("Another job is already running, skipping");
          return null;
        }

        // Get the next pending job
        const nextJob = await prisma.drospectInspection.findFirst({
          where: { status: "pending" },
          orderBy: { createdAt: "asc" },
        });

        if (!nextJob) {
          return null;
        }

        // Immediately mark it as running to prevent race conditions
        await prisma.drospectInspection.update({
          where: { id: nextJob.id },
          data: {
            status: "running",
            startedAt: new Date(),
            pendingNotificationSent: false, // Reset notification flag when job starts
          },
        });

        this.logger.log(`Locked and marked job ${nextJob.id} as running`);
        return nextJob;
      });
    } catch (error) {
      this.logger.error(`Error getting and locking next job: ${error.message}`);
      throw new HttpException(
        { message: "Failed to get and lock next job" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findJobByProjectId(projectId: number) {
    try {
      return await this.prisma.drospectInspection.findFirst({
        where: {
          projectId,
          status: {
            in: ["pending", "running"],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } catch (error) {
      this.logger.error(`Error finding job by project ID: ${error.message}`);
      throw new HttpException(
        { message: "Failed to find job" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getQueueStatus(): Promise<{
    pending: number;
    running: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    try {
      const [pending, running, completed, failed, total] = await Promise.all([
        this.prisma.drospectInspection.count({ where: { status: "pending" } }),
        this.prisma.drospectInspection.count({ where: { status: "running" } }),
        this.prisma.drospectInspection.count({
          where: { status: "completed" },
        }),
        this.prisma.drospectInspection.count({ where: { status: "failed" } }),
        this.prisma.drospectInspection.count(),
      ]);

      return { pending, running, completed, failed, total };
    } catch (error) {
      this.logger.error(`Error getting queue status: ${error.message}`);
      throw new HttpException(
        { message: "Failed to get queue status" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async processNextJob(): Promise<void> {
    try {
      const nextJob = await this.getAndLockNextJob();
      if (!nextJob) {
        this.logger.log("No pending jobs found or job already running");
        return;
      }

      this.logger.log(
        `Processing ${(nextJob as any).source || "DROSPECT"} job ${nextJob.id}`,
      );

      // Job is already marked as running by getAndLockNextJob()

      // Handle different job sources
      if ((nextJob as any).source === "SCOPITO") {
        await this.processScopitoJob(nextJob);
      } else {
        await this.processDrospectJob(nextJob);
      }

      // Don't mark job as completed here - wait for callback from external API
      this.logger.log(
        `Job ${nextJob.id} submitted successfully, waiting for callback`,
      );

      // Note: The job will be marked as completed by the external API callback
      // through the /inspect/update-status endpoint
    } catch (error) {
      this.logger.error(`Fatal error in processNextJob: ${error.message}`);
      this.logger.error(`Stack trace: ${error.stack}`);

      // If we have a job reference, mark it as failed
      try {
        const failedJob = await this.getNextPendingJob();
        if (failedJob) {
          await this.updateJobStatus(failedJob.id, "failed");
        }
      } catch (updateError) {
        this.logger.error(
          `Failed to update job status to failed: ${updateError.message}`,
        );
      }

      throw error;
    }
  }

  private async processDrospectJob(job: any): Promise<void> {
    try {
      // Filter images based on model type
      let isRgbFilter;
      if (job.model === "CLASSIFICATION") {
        // Classification model processes only RGB images
        isRgbFilter = true;
        this.logger.log(`CLASSIFICATION model: filtering for RGB images only`);
      } else {
        // Other models (LOW, HIGH, ROOF) process only thermal images
        isRgbFilter = false;
        this.logger.log(
          `${job.model} model: filtering for thermal images only`,
        );
      }

      // Get images for the project based on model type
      const images = await this.imageService.getImagesbyId(
        1,
        job.limit,
        job.projectId,
        undefined,
        undefined, // Don't filter by inspection status
        undefined,
        isRgbFilter, // Filter by RGB status based on model
      );

      if (!images || !images.images || images.images.length === 0) {
        const imageType = isRgbFilter ? "RGB" : "thermal";

        // Add debugging info to help understand why no images were found
        this.logger.error(`No ${imageType} images found for project ${
          job.projectId
        } with model ${job.model}. Debug info:
          - Job ID: ${job.id}
          - Job limit: ${job.limit}
          - RGB filter: ${isRgbFilter}
          - Images object: ${JSON.stringify(images)}`);

        // Also check if there are any images at all in this project
        const totalImages = await this.imageService.getImagesbyId(
          1,
          1000,
          job.projectId,
        );
        this.logger.error(
          `Total images in project ${job.projectId}: ${
            totalImages?.images?.length || 0
          }`,
        );

        // Check the opposite type to see if that's what's available
        const oppositeImages = await this.imageService.getImagesbyId(
          1,
          10,
          job.projectId,
          undefined,
          undefined,
          undefined,
          !isRgbFilter,
        );
        const oppositeType = !isRgbFilter ? "RGB" : "thermal";
        this.logger.error(
          `Found ${
            oppositeImages?.images?.length || 0
          } ${oppositeType} images in project ${job.projectId}`,
        );

        throw new Error(
          `No ${imageType} images found for project ${job.projectId} with model ${job.model}`,
        );
      }

      const extractedImages = images.images.map((image) => ({
        imageId: (image as any).id,
        imageUrl: image.image,
        imageName: (image as any).imageName,
      }));

      this.logger.log(`Found ${extractedImages.length} images for processing`);

      // Process the job
      this.logger.log(`Calling inspection API for DROSPECT job ${job.id}`);
      const inspectionApiUrl =
        process.env.IMAGE_INSPECTION_API_URL ||
        "https://image-inspect-service-dev-489128681655.us-central1.run.app/inspect/process-images";

      const response = await callApi(inspectionApiUrl, {
        projectId: job.projectId,
        limit: job.limit,
        altitude: job.model,
        imagesData: extractedImages,
        callbackUrl: process.env.CALLBACK_URL || "https://dev.drospect.ai/api",
      });

      this.logger.log(`Inspection API response for job ${job.id}:`, response);
    } catch (error) {
      this.logger.error(
        `Error processing DROSPECT job ${job.id}: ${error.message}`,
      );
      await this.updateJobStatus(job.id, "failed");
      // Send internal failure notification
      await this.mailService.mailInspectionJobFailed({
        source: job.source || "DROSPECT",
        id: job.id,
        model: job.model,
        projectId: job.projectId,
        limit: job.limit,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  private async processScopitoJob(job: any): Promise<void> {
    try {
      this.logger.log(
        `Processing SCOPITO job ${job.id} for project ${job.scopitoProjectId}`,
      );

      // Run the Google Cloud Run job for Scopito
      await this.runScopitoCloudJob(job.model, job.scopitoProjectId);

      this.logger.log(`SCOPITO job ${job.id} submitted to Cloud Run`);
    } catch (error) {
      this.logger.error(
        `Error processing SCOPITO job ${job.id}: ${error.message}`,
      );
      await this.updateJobStatus(job.id, "failed");
      // Send internal failure notification
      await this.mailService.mailInspectionJobFailed({
        source: job.source || "SCOPITO",
        id: job.id,
        model: job.model,
        scopitoProjectId: job.scopitoProjectId,
        modelType: job.modelType,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  private async runScopitoCloudJob(
    model: string,
    projectId: number,
  ): Promise<void> {
    try {
      const scopitoServiceUrl =
        process.env.SCOPITO_SERVICE_URL ||
        "https://image-inspect-service-scopito-dev-489128681655.us-central1.run.app/inspect/execute";

      this.logger.log(
        `Calling Scopito service for project ${projectId} with model ${model}`,
      );
      this.logger.log(`Scopito service URL: ${scopitoServiceUrl}`);

      const response = await callApi(scopitoServiceUrl, {
        project_id: projectId,
        model: model,
      });

      this.logger.log(
        `Scopito service response for project ${projectId}:`,
        response,
      );
    } catch (error) {
      this.logger.error(`Error calling Scopito service: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      throw error;
    }
  }

  async sendCompletionEmailToUser(projectId: number): Promise<void> {
    try {
      // Get project details
      const project = await this.projectService.getProjectById(projectId);
      if (project && project.project.user.connect.id) {
        // Get user email
        const user = await this.userService.getUserById(
          project.project.user.connect.id,
        );
        if (user && user.email) {
          // Send completion email to user
          await this.mailService.mailImageInspectionComplete(
            projectId,
            project.project.name,
            user.email,
          );
          this.logger.log(
            `[MAIL] Inspection completion notification sent to user: ${user.email} for project: ${project.project.name}`,
          );
        }
      }
    } catch (emailError) {
      this.logger.error(
        `Error sending completion email for project ${projectId}: ${emailError.message}`,
      );
      // Don't throw error here - we don't want to fail the status update if email fails
    }
  }

  async updateJobStatusWithEmailNotification(
    projectId: number,
    status: "completed" | "failed",
  ): Promise<{ jobId: number }> {
    // Find the job for this project
    const job = await this.findJobByProjectId(projectId);
    if (!job) {
      throw new HttpException(
        { message: `No job found for project ${projectId}` },
        HttpStatus.NOT_FOUND,
      );
    }

    // Update the job status
    await this.updateJobStatus(job.id, status);

    // Reset project inspection flag to allow re-triggering AI inspection
    await this.projectService.editProjectInspection(projectId, false);

    // If the job was completed, handle any remaining queued images and send completion email
    if (status === "completed") {
      // Check for any images still in 'queued' status (these would be healthy images that weren't processed by uploadUnhealthyPanels)
      const queuedImages = await this.prisma.images.findMany({
        where: {
          projectId,
          processingStatus: "queued",
          isDeleted: false,
        },
        select: { id: true },
      });

      if (queuedImages.length > 0) {
        this.logger.log(
          `Found ${queuedImages.length} images still in 'queued' status for project ${projectId}. Marking them as healthy.`,
        );

        const imageIds = queuedImages.map((img) => img.id);
        await this.imageService.markImagesCompleted(imageIds, true);

        // Trigger statistics update
        await this.imageService.PanelStatistics(projectId, 0, 1);
      }

      await this.sendCompletionEmailToUser(projectId);
    }

    return { jobId: job.id };
  }
}
