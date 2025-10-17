import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma.service";
import { NodeOdmService, NodeOdmOptions } from "./nodeodm.service";
import { SplitCalculatorService } from "./split-calculator.service";
import { ZipProcessingService } from "./zip-processing.service";
import { CogProcessingService } from "./cog-processing.service";
import { WalletService } from "../wallet/wallet.service";
import { GcsUploadService } from "../googleStorage/storage.service";
import { ThermalProcessingTask } from "@prisma/client";
import { callApi } from "../helpers/python-api-trigger-helper";

export interface CreateThermalTaskDto {
  projectId: number;
  images: any[];
  options?: NodeOdmOptions;
}

export interface ThermalTaskStatus {
  id: string;
  projectId: number;
  status: string;
  progress: number;
  imagesCount: number;
  model?: string;
  resultUrl?: string;
  cogUrl?: string;
  tileServiceUrl?: string;
  bounds?: any; // [minLng, minLat, maxLng, maxLat]
  maxZoom?: number;
  minZoom?: number;
  cogCreatedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  webhook?: string;
}

@Injectable()
export class ThermalProcessingService {
  private readonly logger = new Logger(ThermalProcessingService.name);

  constructor(
    private prisma: PrismaService,
    private nodeOdmService: NodeOdmService,
    private zipProcessingService: ZipProcessingService,
    private cogProcessingService: CogProcessingService,
    private splitCalculatorService: SplitCalculatorService,
    private walletService: WalletService,
    private gcsUploadService: GcsUploadService,
  ) {}

  /**
   * Start a new thermal processing task
   * @param dto Task creation data
   * @returns Created thermal processing task
   */
  async startThermalProcessing(
    dto: CreateThermalTaskDto,
  ): Promise<ThermalTaskStatus> {
    try {
      this.logger.log(
        `Starting thermal processing for project ${dto.projectId}`,
      );

      // Validate project exists
      const project = await this.prisma.project.findUnique({
        where: { id: dto.projectId },
      });

      if (!project) {
        throw new NotFoundException(
          `Project with ID ${dto.projectId} not found`,
        );
      }

      // Validate images
      if (!dto.images || dto.images.length === 0) {
        throw new BadRequestException(
          "At least one image is required for thermal processing",
        );
      }

      // Calculate optimal split settings based on image count
      // Default to 'rooftop' for backwards compatibility when no model is specified
      const flightType =
        this.splitCalculatorService.getFlightTypeFromModel("ROOF");
      const calculationOptions =
        this.splitCalculatorService.getDefaultCalculationOptions();
      const splitSettings = this.splitCalculatorService.calculateSplitSettings(
        dto.images.length,
        flightType,
        calculationOptions,
      );

      this.logger.log(
        `Calculated split settings for ${dto.images.length} images (default): ` +
          `split=${splitSettings.imagesPerChunk}, split-overlap=${splitSettings.overlapMeters}`,
      );

      // Prepare options with calculated split settings
      const splitOptions = {
        ...dto.options,
        split: splitSettings.imagesPerChunk,
        "split-overlap": splitSettings.overlapMeters,
      };

      // Generate a single UUID to use for both database and NodeODM
      const taskUuid = randomUUID();

      // Use streaming upload for large batches
      if (dto.images.length > 100) {
        this.logger.log(
          `Using streaming upload for ${dto.images.length} images`,
        );
        await this.nodeOdmService.createTaskWithStreaming(
          dto.images,
          splitOptions,
          taskUuid,
          (progress) => {
            this.logger.log(`Upload progress: ${progress.percentage}%`);
          },
        );
      } else {
        // Use regular upload for smaller batches
        await this.nodeOdmService.createTask(
          dto.images,
          splitOptions,
          taskUuid,
        );
      }

      // Save task to database using the same UUID
      const thermalTask = await this.prisma.thermalProcessingTask.create({
        data: {
          id: taskUuid, // Single UUID for both database and NodeODM
          projectId: dto.projectId,
          status: "pending",
          progress: 0,
          imagesCount: dto.images.length,
          nodeOdmOptions: splitOptions as any,
        },
      });

      this.logger.log(
        `Thermal processing task created with ID: ${thermalTask.id}`,
      );

      return this.mapToTaskStatus(thermalTask);
    } catch (error) {
      this.logger.error("Failed to start thermal processing:", error);
      throw error;
    }
  }

  /**
   * Start thermal processing with existing project images and selected model
   * @param projectId Project ID
   * @param model Model type (LOW, HIGH, ROOF)
   * @param options NodeODM options
   * @param userId User ID for credit deduction
   * @returns Created thermal processing task
   */
  async startThermalProcessingWithModel(
    projectId: number,
    model: string,
    options: any,
    userId: string,
    webhook: string,
  ): Promise<ThermalTaskStatus> {
    try {
      this.logger.log(
        `Starting thermal processing with model ${model} for project ${projectId}`,
      );

      // Validate project exists
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new NotFoundException(`Project with ID ${projectId} not found`);
      }

      // Get thermal images from project (rgb: false)
      const thermalImages = await this.prisma.images.findMany({
        where: {
          projectId: projectId,
          rgb: false, // Only thermal images
          isDeleted: false,
        },
        select: {
          image: true,
          imageName: true,
        },
      });

      if (!thermalImages || thermalImages.length === 0) {
        throw new BadRequestException(
          "No thermal images found in this project. Please upload thermal images first.",
        );
      }

      this.logger.log(
        `Found ${thermalImages.length} thermal images for processing`,
      );

      // Check and deduct credits before processing
      await this.walletService.checkAndDeductCredits(
        userId,
        thermalImages.length,
        model,
        projectId,
        `Thermal processing for project ${projectId}`,
      );

      // Calculate optimal split settings based on image count and model type
      const flightType =
        this.splitCalculatorService.getFlightTypeFromModel(model);
      const calculationOptions =
        this.splitCalculatorService.getDefaultCalculationOptions();
      const splitSettings = this.splitCalculatorService.calculateSplitSettings(
        thermalImages.length,
        flightType,
        calculationOptions,
      );

      this.logger.log(
        `Calculated split settings for ${thermalImages.length} images (${model}): ` +
          `split=${splitSettings.imagesPerChunk}, split-overlap=${splitSettings.overlapMeters}`,
      );

      // Generate a single UUID to use for both database and NodeODM
      const taskUuid = randomUUID();
      // Construct webhook URL for this specific task
      const webhookUrl = `${webhook}/${taskUuid}/end`;

      // Prepare NodeODM options with calculated split settings and webhook
      const splitOptions = {
        ...options,
        split: splitSettings.imagesPerChunk,
        "split-overlap": splitSettings.overlapMeters,
        webhook: webhookUrl,
      };

      // Create DB task immediately as queued (unblocked UX)
      const queuedTask = await this.prisma.thermalProcessingTask.create({
        data: {
          id: taskUuid,
          projectId: projectId,
          status: "queued", // waiting for ZIP
          progress: 0,
          imagesCount: thermalImages.length,
          model: model,
          nodeOdmOptions: splitOptions as any,
          webhook: webhookUrl,
        },
      });

      // Ensure ZIP exists or is being created; do not block response
      const bucketName = process.env.GCS_BUCKET_NAME || "drospect-bucket";
      const zipStatus = await this.gcsUploadService.getZipStatus(
        bucketName,
        projectId,
        `${projectId}.zip`,
      );

      if (zipStatus.status === "pending") {
        this.logger.log(
          `ZIP pending for project ${projectId}. Starting background ZIP build...`,
        );
        this.gcsUploadService
          .zipAndUpload(bucketName, `${projectId}.zip`, projectId)
          .catch((e) =>
            this.logger.error(`Background zip failed to start: ${e}`),
          );
      } else if (zipStatus.status === "completed") {
        // Start NodeODM in background immediately; do not block response
        const zipUrl = `https://storage.googleapis.com/${bucketName}/${projectId}/${projectId}.zip`;
        (async () => {
          try {
            this.logger.log(
              `ZIP already available. Starting NodeODM from ${zipUrl} for task ${taskUuid}`,
            );
            await this.nodeOdmService.createTaskFromZipUrl(
              zipUrl,
              splitOptions,
              taskUuid,
            );
            await this.prisma.thermalProcessingTask.update({
              where: { id: taskUuid },
              data: { status: "pending", updatedAt: new Date() },
            });
          } catch (e: any) {
            this.logger.error(
              `Failed immediate NodeODM start: ${e?.message || e}`,
            );
            await this.prisma.thermalProcessingTask.update({
              where: { id: taskUuid },
              data: {
                status: "failed",
                errorMessage: `Failed to start NodeODM: ${e?.message || e}`,
                updatedAt: new Date(),
              },
            });
            // Refund credits to project owner on start failure (idempotent)
            try {
              await this.refundTaskCreditsById(
                taskUuid,
                `Failed to start NodeODM: ${e?.message || e}`,
              );
            } catch (refundError) {
              this.logger.warn(
                `Refund attempt failed for ${taskUuid}: ${
                  (refundError as any)?.message || refundError
                }`,
              );
            }
          }
        })();
      } else {
        // in_progress → do nothing; scheduler will start it when ready
        this.logger.log(
          `ZIP is in progress for project ${projectId}. Task ${taskUuid} queued and will auto-start when ready.`,
        );
      }

      return this.mapToTaskStatus(queuedTask);
    } catch (error) {
      this.logger.error(
        "Failed to start thermal processing with model:",
        error,
      );
      // Best-effort refund
      try {
        // Refund only if credits were deducted, and task exists to mark idempotence
        if ((error as any) && (error as any).message) {
          this.logger.debug(
            `Start flow error: ${(error as any).message}. Evaluating refund...`,
          );
        }

        // Try to identify latest queued/starting task for this project with the same model
        const latestTask = await this.prisma.thermalProcessingTask.findFirst({
          where: {
            projectId,
            status: { in: ["queued", "starting", "failed"] },
          },
          orderBy: { createdAt: "desc" },
        });
        if (latestTask) {
          await this.refundTaskCreditsById(
            latestTask.id,
            `Start failure: ${(error as any)?.message || error}`,
          );
        }
      } catch (refundError) {
        this.logger.warn(
          `Refund attempt after start failure failed: ${
            (refundError as any)?.message || refundError
          }`,
        );
      }
      throw error;
    }
  }

  /**
   * Lightweight HEAD check to verify the public GCS ZIP is available
   */
  private async isZipUrlAvailable(zipUrl: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      const response = await fetch(zipUrl, {
        method: "HEAD",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        return true;
      }
      this.logger.warn(
        `ZIP availability check returned status ${response.status} for ${zipUrl}`,
      );
      return false;
    } catch (error: any) {
      this.logger.warn(
        `ZIP availability check failed for ${zipUrl}: ${error.message}`,
      );
      return false;
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Download images from URLs to create file objects for NodeODM (Optimized for large batches)
   * @param thermalImages Array of thermal image records
   * @returns Array of file-like objects or URLs for streaming
   */
  private async downloadImagesFromUrls(thermalImages: any[]): Promise<any[]> {
    // For large batches, return URLs for streaming instead of downloading
    if (thermalImages.length > 100) {
      this.logger.log(
        `Large batch detected (${thermalImages.length} images). Using URL streaming.`,
      );
      return thermalImages.map((image) => ({
        url: image.image,
        originalname: image.imageName,
        mimetype: "image/jpeg",
      }));
    }

    // For smaller batches, download images with connection pooling
    const imageFiles = [];
    const batchSize = 10; // Process 10 images concurrently
    const batches = [];

    for (let i = 0; i < thermalImages.length; i += batchSize) {
      const batch = thermalImages.slice(i, i + batchSize);
      batches.push(batch);
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (image) => {
        try {
          // Download image from URL with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

          const response = await fetch(image.image, {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`Failed to download image: ${response.statusText}`);
          }

          const buffer = await response.arrayBuffer();

          // Create file-like object
          const fileObj = {
            buffer: Buffer.from(buffer),
            originalname: image.imageName,
            mimetype: "image/jpeg", // Assume JPEG, could be enhanced to detect type
            size: buffer.byteLength,
          };

          return fileObj;
        } catch (error) {
          this.logger.error(
            `Failed to download image ${image.imageName}:`,
            error,
          );
          throw new BadRequestException(
            `Failed to download thermal image: ${image.imageName}`,
          );
        }
      });

      // Wait for batch to complete before processing next batch
      const batchResults = await Promise.all(batchPromises);
      imageFiles.push(...batchResults);

      this.logger.log(
        `Downloaded batch of ${batch.length} images. Total: ${imageFiles.length}/${thermalImages.length}`,
      );
    }

    return imageFiles;
  }

  /**
   * Get thermal processing task status
   * @param taskId Database task ID
   * @returns Task status
   */
  async getTaskStatus(taskId: string): Promise<ThermalTaskStatus> {
    try {
      const task = await this.prisma.thermalProcessingTask.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new NotFoundException(
          `Thermal processing task with ID ${taskId} not found`,
        );
      }

      // If task hasn't started on NodeODM yet, reflect ZIP state instead of erroring
      if (task.status === "queued" || task.status === "starting") {
        const bucketName = process.env.GCS_BUCKET_NAME || "drospect-bucket";
        const zipStatus = await this.gcsUploadService.getZipStatus(
          bucketName,
          task.projectId,
          `${task.projectId}.zip`,
        );

        const base = this.mapToTaskStatus(task);

        if (zipStatus.status === "in_progress") {
          // Report a friendly transitional state to the frontend
          return { ...base, status: "zipping", errorMessage: undefined };
        }

        if (zipStatus.status === "pending") {
          // Not started yet; keep showing queued
          return { ...base, status: "queued", errorMessage: undefined };
        }
        // If completed, auto-starter/background hook will start NodeODM shortly.
        // Fall through to try NodeODM for freshest info (may still not exist yet).
      }

      // For terminal states just return the DB snapshot
      if (
        task.status === "completed" ||
        task.status === "failed" ||
        task.status === "cancelled"
      ) {
        return this.mapToTaskStatus(task);
      }

      // Otherwise, attempt to get live info from NodeODM but never surface transient errors to the UI
      try {
        const nodeOdmInfo = await this.nodeOdmService.getTaskInfo(task.id);
        const updatedTask = await this.updateTaskProgress(task.id, nodeOdmInfo);
        return this.mapToTaskStatus(updatedTask);
      } catch (e: any) {
        this.logger.warn(
          `NodeODM info not available yet for ${taskId}: ${
            e?.message || e
          }. Returning last known status.`,
        );
        return this.mapToTaskStatus(task);
      }
    } catch (error) {
      this.logger.error(`Failed to get task status for ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Get all thermal processing tasks for a project
   * @param projectId Project ID
   * @returns Array of task statuses
   */
  async getProjectThermalTasks(
    projectId: number,
  ): Promise<ThermalTaskStatus[]> {
    try {
      const tasks = await this.prisma.thermalProcessingTask.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      });

      return tasks.map((task) => this.mapToTaskStatus(task));
    } catch (error) {
      this.logger.error(
        `Failed to get thermal tasks for project ${projectId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Cancel a thermal processing task
   * @param taskId Database task ID
   * @returns Success status
   */
  async cancelTask(taskId: string): Promise<boolean> {
    try {
      const task = await this.prisma.thermalProcessingTask.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new NotFoundException(
          `Thermal processing task with ID ${taskId} not found`,
        );
      }

      // Try to cancel in NodeODM
      const cancelled = await this.nodeOdmService.cancelTask(task.id);

      // Clean up result file if it exists
      if (task.resultUrl) {
        try {
          await this.zipProcessingService.deleteOrthomosaicFile(task.resultUrl);
          this.logger.log(
            `Cleaned up result file for cancelled task ${taskId}`,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to clean up result file for task ${taskId}:`,
            error,
          );
        }
      }

      // Update database status
      await this.prisma.thermalProcessingTask.update({
        where: { id: taskId },
        data: {
          status: "cancelled",
          resultUrl: null, // Clear the result URL
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Thermal processing task ${taskId} cancelled`);
      // Refund on cancellation (idempotent)
      try {
        await this.refundTaskCreditsById(
          taskId,
          "Task cancelled by user/system",
        );
      } catch (refundError) {
        this.logger.warn(
          `Refund attempt failed for cancelled task ${taskId}: ${
            (refundError as any)?.message || refundError
          }`,
        );
      }
      return cancelled;
    } catch (error) {
      this.logger.error(`Failed to cancel task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Update task progress from NodeODM response
   * @param taskId Database task ID
   * @param nodeOdmInfo NodeODM task information
   * @returns Updated task
   */
  private async updateTaskProgress(
    taskId: string,
    nodeOdmInfo: any,
  ): Promise<ThermalProcessingTask> {
    const status = this.mapNodeOdmStatusToString(nodeOdmInfo.status.code);

    // Prepare update data
    const updateData: any = {
      status,
      progress: nodeOdmInfo.progress || 0,
      updatedAt: new Date(),
    };

    // If NodeODM reports failure (status 30 or 50), include error message
    if (nodeOdmInfo.status.code === 50 || nodeOdmInfo.status.code === 30) {
      updateData.errorMessage =
        nodeOdmInfo.last_error || "Task failed on NodeODM server";
      this.logger.warn(
        `Task ${taskId} failed on NodeODM: ${updateData.errorMessage}`,
      );
    }

    return await this.prisma.thermalProcessingTask.update({
      where: { id: taskId },
      data: updateData,
    });
  }

  /**
   * Map NodeODM status code to string
   * @param statusCode NodeODM status code
   * @returns Status string
   */
  private mapNodeOdmStatusToString(statusCode: number): string {
    switch (statusCode) {
      case 10:
        return "queued";
      case 20:
        return "processing";
      case 40:
        return "completed";
      case 50:
        return "failed";
      case 30:
        return "failed";
      default:
        return "pending";
    }
  }

  /**
   * Map database task to status response
   * @param task Database task
   * @returns Task status
   */
  private mapToTaskStatus(task: ThermalProcessingTask): ThermalTaskStatus {
    return {
      id: task.id,
      projectId: task.projectId,
      status: task.status,
      progress: task.progress,
      imagesCount: task.imagesCount,
      model: task.model,
      resultUrl: task.resultUrl,
      cogUrl: task.cogUrl,
      tileServiceUrl: task.tileServiceUrl,
      bounds: task.bounds,
      maxZoom: task.maxZoom,
      minZoom: task.minZoom,
      cogCreatedAt: task.cogCreatedAt,
      errorMessage: task.errorMessage,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      webhook: task.webhook as string,
    };
  }

  /**
   * Process completed task - download and save results
   * @param taskId Database task ID
   * @returns Processing result
   */
  async processCompletedTask(
    taskId: string,
  ): Promise<{ success: boolean; resultUrl?: string }> {
    try {
      const task = await this.prisma.thermalProcessingTask.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new NotFoundException(`Task ${taskId} not found`);
      }

      if (task.status !== "completed") {
        throw new BadRequestException(`Task ${taskId} is not completed`);
      }

      // If result URL already exists, return it
      if (task.resultUrl) {
        this.logger.log(
          `Task ${taskId} already has result URL: ${task.resultUrl}`,
        );
        return { success: true, resultUrl: task.resultUrl };
      }

      this.logger.log(
        `Processing completed task ${taskId}, downloading ZIP from NodeODM...`,
      );

      // Download result ZIP from NodeODM (refund on download failure)
      let zipBuffer: Buffer;
      try {
        zipBuffer = await this.nodeOdmService.downloadTaskResult(task.id);
      } catch (downloadError: any) {
        this.logger.error(
          `Download failed for task ${taskId}: ${
            downloadError?.message || downloadError
          }`,
        );
        try {
          await this.refundTaskCreditsById(
            taskId,
            `Failed to download results: ${
              downloadError?.message || downloadError
            }`,
          );
        } catch (refundError) {
          this.logger.warn(
            `Refund attempt failed after download error for ${taskId}: ${
              (refundError as any)?.message || refundError
            }`,
          );
        }
        throw downloadError;
      }

      this.logger.log(
        `Downloaded ZIP file for task ${taskId}, size: ${zipBuffer.length} bytes`,
      );

      // Extract both PNG and TIF orthomosaic files from ZIP
      const zipResults =
        await this.zipProcessingService.processOrthomosaicZipWithCog(
          zipBuffer,
          task.projectId,
          task.id,
        );

      const updateData: any = {
        updatedAt: new Date(),
      };

      // Set PNG result URL if available
      if (zipResults.pngUrl) {
        updateData.resultUrl = zipResults.pngUrl;
        this.logger.log(`PNG orthomosaic uploaded: ${zipResults.pngUrl}`);
      }

      // Process TIF to COG if available
      if (zipResults.tifBuffer) {
        try {
          this.logger.log("Processing TIF to COG format...");
          const cogResult = await this.cogProcessingService.processTifToCog(
            zipResults.tifBuffer,
            task.projectId,
            task.id,
          );

          // Update task with COG information
          updateData.cogUrl = cogResult.cogUrl;
          updateData.bounds = cogResult.metadata.bounds;
          updateData.maxZoom = cogResult.metadata.maxZoom;
          updateData.minZoom = cogResult.metadata.minZoom;
          updateData.cogCreatedAt = new Date();

          // Generate tile service URL (will be used in Task 3)
          updateData.tileServiceUrl = `/api/tiles/${task.id}`;

          this.logger.log(`COG processed successfully: ${cogResult.cogUrl}`);
          this.logger.log(
            `Bounds: ${JSON.stringify(cogResult.metadata.bounds)}`,
          );
          this.logger.log(
            `Zoom levels: ${cogResult.metadata.minZoom} - ${cogResult.metadata.maxZoom}`,
          );
        } catch (cogError) {
          this.logger.error(
            `Failed to process TIF to COG for task ${taskId}:`,
            cogError,
          );
          // Don't fail the entire task if COG processing fails
          updateData.errorMessage = `COG processing failed: ${cogError.message}`;
        }
      }

      // Update task with all results
      await this.prisma.thermalProcessingTask.update({
        where: { id: taskId },
        data: updateData,
      });

      this.logger.log(
        `Thermal processing task ${taskId} results processed successfully. Result URL: ${
          updateData.resultUrl || "No PNG result"
        }`,
      );

      // Call Python script API after unzipping is completed
      if (updateData.resultUrl) {
        try {
          this.logger.log(
            `Calling Python script API after unzipping for task ${taskId}`,
          );

          const pythonApiUrl =
            process.env.PYTHON_SCRIPT_API_URL ||
            "https://image-inspect-service-dev-489128681655.us-central1.run.app/inspect/process-images";
          //remove the .png from the url and replace with .tif
          const tifUrl = updateData.resultUrl.replace(".png", ".tif");
          await callApi(pythonApiUrl, {
            projectId: task.projectId,
            taskId: taskId,
            orthoUrl: tifUrl,
            callbackUrl:
              process.env.CALLBACK_URL || "https://dev.drospect.ai/api",
          });

          this.logger.log(
            `Python script API call successful for task ${taskId}`,
          );
        } catch (apiError) {
          this.logger.error(
            `Failed to call Python script API for task ${taskId}:`,
            apiError,
          );
          // Don't fail the entire task if Python script API call fails
          updateData.errorMessage = `Python script processing failed: ${apiError.message}`;
        }
      }

      return { success: true, resultUrl: updateData.resultUrl };
    } catch (error) {
      this.logger.error(`Failed to process completed task ${taskId}:`, error);

      // Update task with error
      await this.prisma.thermalProcessingTask.update({
        where: { id: taskId },
        data: {
          status: "failed",
          errorMessage: error.message,
          updatedAt: new Date(),
        },
      });

      return { success: false };
    }
  }

  /**
   * Handle webhook completion from NodeODM when processing is finished
   * @param taskId Database task ID
   * @returns Success status and result URL
   */
  async handleWebhookCompletion(
    taskId: string,
  ): Promise<{ success: boolean; resultUrl?: string }> {
    try {
      this.logger.log(`Handling webhook completion for task ${taskId}`);

      // Get task from database
      const task = await this.prisma.thermalProcessingTask.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new NotFoundException(`Task ${taskId} not found`);
      }

      // Check if task is already completed
      if (task.status === "completed" && task.resultUrl) {
        this.logger.log(
          `Task ${taskId} already completed with result URL: ${task.resultUrl}`,
        );
        return { success: true, resultUrl: task.resultUrl };
      }

      // Update task status to completed
      await this.prisma.thermalProcessingTask.update({
        where: { id: taskId },
        data: {
          status: "completed",
          progress: 100,
          updatedAt: new Date(),
        },
      });

      // Process the completed task (download, extract, convert to COG, etc.)
      return await this.processCompletedTask(taskId);
    } catch (error) {
      this.logger.error(
        `Failed to handle webhook completion for task ${taskId}:`,
        error,
      );

      // Mark task as failed
      await this.markTaskAsFailed(taskId, error.message);

      // Refund if this failure corresponds to a start or download failure (processCompletedTask handles download refunds)
      try {
        await this.refundTaskCreditsById(
          taskId,
          `Webhook processing failed: ${(error as any)?.message || error}`,
        );
      } catch (refundError) {
        this.logger.warn(
          `Refund attempt failed in webhook handler for ${taskId}: ${
            (refundError as any)?.message || refundError
          }`,
        );
      }

      return { success: false };
    }
  }

  /**
   * Mark a task as failed (called from frontend when polling fails)
   * @param taskId Database task ID
   * @param errorMessage Error message to store
   * @returns Success status
   */
  async markTaskAsFailed(
    taskId: string,
    errorMessage: string,
  ): Promise<boolean> {
    try {
      const task = await this.prisma.thermalProcessingTask.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        this.logger.warn(
          `Task ${taskId} not found when trying to mark as failed`,
        );
        return false;
      }

      // Do not fail/cancel tasks that are still waiting for ZIP to be ready
      if (task.status === "queued" || task.status === "starting") {
        const bucketName = process.env.GCS_BUCKET_NAME || "drospect-bucket";
        const zipStatus = await this.gcsUploadService.getZipStatus(
          bucketName,
          task.projectId,
          `${task.projectId}.zip`,
        );
        if (zipStatus.status !== "completed") {
          this.logger.log(
            `Suppressing fail for ${taskId}: ZIP is ${zipStatus.status}. Keeping task queued.`,
          );
          await this.prisma.thermalProcessingTask.update({
            where: { id: taskId },
            data: { status: "queued", updatedAt: new Date() },
          });
          return true;
        }
      }

      // Update task status to failed
      await this.prisma.thermalProcessingTask.update({
        where: { id: taskId },
        data: {
          status: "failed",
          errorMessage: errorMessage,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Task ${taskId} marked as failed in database. Error: ${errorMessage}`,
      );

      // Try to cancel the task in NodeODM if it's still running
      try {
        await this.nodeOdmService.cancelTask(task.id);
        this.logger.log(
          `Cancelled NodeODM task ${task.id} for failed task ${taskId}`,
        );
      } catch (error) {
        this.logger.warn(
          `Could not cancel NodeODM task ${task.id} for failed task ${taskId}:`,
          error.message,
        );
        // Don't throw error - task is already marked as failed
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to mark task ${taskId} as failed:`, error);
      return false;
    }
  }

  /**
   * Upload panel data for a thermal processing task
   * @param taskId Database task ID
   * @param panelData Array of panel detection data
   * @returns Success status and message
   */
  async uploadPanelData(
    taskId: string,
    panelData: any[],
  ): Promise<{ success: boolean; message: string }> {
    try {
      const task = await this.prisma.thermalProcessingTask.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        return {
          success: false,
          message: `Task ${taskId} not found`,
        };
      }

      // Derive and persist a human-friendly title per panel
      const transformedPanelData = Array.isArray(panelData)
        ? panelData.map((panel, idx) => {
            try {
              const index = panel?.index ?? idx;
              const sourceModel = String(
                panel?.source_model || "",
              ).toUpperCase();
              const classificationRaw = panel?.classification;
              const hasValidClassification =
                sourceModel === "LOW" &&
                typeof classificationRaw === "string" &&
                classificationRaw.trim().length > 0 &&
                classificationRaw.trim().toLowerCase() !== "unknown";

              const title = hasValidClassification
                ? `${classificationRaw} #${index}`
                : `Defect #${index}`;

              return { ...panel, title };
            } catch (_) {
              // Fallback on any unexpected data shape
              const safeIndex = panel?.index ?? idx;
              return { ...panel, title: `Defect #${safeIndex}` };
            }
          })
        : panelData;

      // Update task with panel data
      await this.prisma.thermalProcessingTask.update({
        where: { id: taskId },
        data: {
          panelData: transformedPanelData,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Panel data uploaded successfully for task ${taskId}. Panel count: ${panelData.length}`,
      );

      return {
        success: true,
        message: `Panel data uploaded successfully. ${panelData.length} panels saved.`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload panel data for task ${taskId}:`,
        error,
      );
      return {
        success: false,
        message: `Failed to upload panel data: ${error.message}`,
      };
    }
  }

  /**
   * Get panel data for a thermal processing task
   * @param taskId Database task ID
   * @returns Success status and panel data if available
   */
  async getPanelData(
    taskId: string,
  ): Promise<{ success: boolean; panelData?: any[]; message?: string }> {
    try {
      const task = await this.prisma.thermalProcessingTask.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          panelData: true,
          status: true,
        },
      });

      if (!task) {
        return {
          success: false,
          message: `Task ${taskId} not found`,
        };
      }

      if (!task.panelData) {
        return {
          success: true,
          message: "No panel data available for this task",
        };
      }

      this.logger.log(
        `Panel data retrieved successfully for task ${taskId}. Panel count: ${
          Array.isArray(task.panelData) ? task.panelData.length : "N/A"
        }`,
      );

      // Ensure title exists for all panels even if older records were saved without it
      const originalPanels = (task.panelData as any[]) || [];
      const panelsWithTitle = originalPanels.map((panel, idx) => {
        if (
          panel &&
          typeof panel.title === "string" &&
          panel.title.length > 0
        ) {
          return panel;
        }

        try {
          const index = panel?.index ?? idx;
          const sourceModel = String(panel?.source_model || "").toUpperCase();
          const classificationRaw = panel?.classification;
          const hasValidClassification =
            sourceModel === "LOW" &&
            typeof classificationRaw === "string" &&
            classificationRaw.trim().length > 0 &&
            classificationRaw.trim().toLowerCase() !== "unknown";

          const title = hasValidClassification
            ? `${classificationRaw} #${index}`
            : `Defect #${index}`;

          return { ...panel, title };
        } catch (_) {
          const safeIndex = panel?.index ?? idx;
          return { ...panel, title: `Defect #${safeIndex}` };
        }
      });

      return {
        success: true,
        panelData: panelsWithTitle,
      };
    } catch (error) {
      this.logger.error(
        `Failed to retrieve panel data for task ${taskId}:`,
        error,
      );
      return {
        success: false,
        message: `Failed to retrieve panel data: ${error.message}`,
      };
    }
  }
  // Public refund helper
  async refundTaskCreditsById(
    taskId: string,
    reason: string,
  ): Promise<{ refunded: boolean; amount?: number }> {
    const task = await this.prisma.thermalProcessingTask.findUnique({
      where: { id: taskId },
    });
    if (!task) {
      this.logger.warn(
        `refundTaskCreditsById: Task ${taskId} not found. Skipping refund.`,
      );
      return { refunded: false };
    }

    const alreadyRefunded =
      typeof task.errorMessage === "string" &&
      task.errorMessage.includes("Refund issued:");
    if (alreadyRefunded) {
      this.logger.log(
        `Refund already issued for task ${taskId}, skipping duplicate.`,
      );
      return { refunded: false };
    }

    // Refund amount: always imagesCount * 2 for Ortho credits
    const refundAmount = (task.imagesCount || 0) * 2;
    if (refundAmount <= 0) {
      this.logger.warn(
        `refundTaskCreditsById: Computed refund 0 for ${taskId}. Skipping.`,
      );
      return { refunded: false };
    }

    // Resolve project owner
    const project = await this.prisma.project.findUnique({
      where: { id: task.projectId },
      select: { userId: true },
    });
    if (!project?.userId) {
      this.logger.warn(
        `refundTaskCreditsById: No project owner for task ${taskId}. Skipping refund.`,
      );
      return { refunded: false };
    }

    // Apply refund to owner's wallet (adds to existing credits)
    await this.walletService.updateByUserId(project.userId, {
      credits: refundAmount,
    });

    // Mark task to prevent duplicate refunds
    const marker = `Refund issued: ${refundAmount} credits`;
    const message = reason ? `${marker} - ${reason}` : marker;
    await this.prisma.thermalProcessingTask.update({
      where: { id: taskId },
      data: {
        errorMessage: task.errorMessage
          ? `${task.errorMessage}\n${message}`
          : message,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `Refunded ${refundAmount} credits to owner of project ${task.projectId} for task ${taskId}`,
    );
    return { refunded: true, amount: refundAmount };
  }
}
