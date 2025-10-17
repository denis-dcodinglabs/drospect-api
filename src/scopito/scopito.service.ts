import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { InspectService } from "../inspect/inspect.service";
import { ImageStatisticsDto } from "./dto/scopito-status.dto";
import axios from "axios";

@Injectable()
export class ScopitoService {
  private readonly logger = new Logger(ScopitoService.name);
  private readonly SKIP_IDS = new Set([
    2573, 2574, 2691, 2693, 2695, 2696, 2698, 2705, 2706, 2712, 2714, 2715,
    2716, 2736,
  ]);
  private accessToken: string = "";

  constructor(
    private prisma: PrismaService,
    private inspectService: InspectService,
  ) {}

  private async getAccessToken(): Promise<void> {
    try {
      this.logger.log(
        `[getAccessToken] Requesting access token from Scopito API...`,
      );

      const response = await axios.post(
        "https://app.scopito.com/auth/oauth2/token",
        "grant_type=client_credentials",
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(
              `${process.env.SCOPITO_CLIENT_ID}:${process.env.SCOPITO_CLIENT_SECRET}`,
            ).toString("base64")}`,
          },
        },
      );

      if (response.status === 200) {
        this.accessToken = response.data.access_token;
        this.logger.log(
          `[getAccessToken] Successfully obtained Scopito access token`,
        );
      } else {
        this.logger.error(
          `[getAccessToken] Failed to get access token: ${response.status} ${response.statusText}`,
        );
        throw new Error(
          `Failed to get access token: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[getAccessToken] Error getting access token: ${error.message}`,
      );
      throw new HttpException(
        { message: "Failed to authenticate with Scopito API" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async makeRequest(
    url: string,
    method: "GET" | "POST" = "GET",
    data?: any,
  ): Promise<any> {
    try {
      const headers = {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      };

      const response = await axios.request({
        method,
        url,
        headers,
        data,
      });

      // Check if token expired and retry once
      if (response.status === 401) {
        this.logger.log("Token expired, getting new token and retrying...");
        await this.getAccessToken();
        headers["Authorization"] = `Bearer ${this.accessToken}`;

        return await axios.request({
          method,
          url,
          headers,
          data,
        });
      }

      return response.data;
    } catch (error) {
      this.logger.error(`Error making request to ${url}: ${error.message}`);
      throw error;
    }
  }

  private async getScopitoPendingInspections(): Promise<any[]> {
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      return await this.prisma.drospectInspection.findMany({
        where: {
          source: "SCOPITO",
          createdAt: {
            gte: twentyFourHoursAgo,
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching Scopito pending inspections: ${error.message}`,
      );
      throw new HttpException(
        { message: "Failed to fetch pending inspections" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async addNewScopitoInspections(
    inspections: any[],
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(
        `[addNewScopitoInspections] Adding ${inspections.length} new Scopito inspections to queue`,
      );

      for (const inspection of inspections) {
        const scopitoProjectId = inspection.id;
        const modelType = inspection.modelId;

        this.logger.log(
          `[addNewScopitoInspections] Processing inspection ID: ${scopitoProjectId}, modelType: ${modelType}`,
        );

        // Check if inspection already exists
        const existingInspection =
          await this.prisma.drospectInspection.findFirst({
            where: {
              scopitoProjectId: scopitoProjectId,
              source: "SCOPITO",
            },
          });

        if (!existingInspection) {
          // Create new Scopito job using the unified queue
          this.logger.log(
            `[addNewScopitoInspections] Creating new job for Scopito project: ${scopitoProjectId}`,
          );
          const jobId = await this.inspectService.createScopitoJob(
            scopitoProjectId,
            modelType,
          );
          this.logger.log(
            `[addNewScopitoInspections] Successfully added Scopito inspection: ${scopitoProjectId} with job ID: ${jobId}`,
          );
        } else {
          this.logger.log(
            `[addNewScopitoInspections] Inspection ${scopitoProjectId} already exists, skipping`,
          );
        }
      }

      this.logger.log(
        `[addNewScopitoInspections] Successfully added all new Scopito inspections`,
      );
      return {
        success: true,
        message: "Scopito inspections added successfully",
      };
    } catch (error) {
      this.logger.error(
        `[addNewScopitoInspections] Error adding new Scopito inspections: ${error.message}`,
      );
      this.logger.error(
        `[addNewScopitoInspections] Stack trace: ${error.stack}`,
      );
      return {
        success: false,
        message: `Error adding new inspections: ${error.message}`,
      };
    }
  }

  async startInspection(
    modelType: number,
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(
        `[startInspection] Starting inspection process for model type: ${modelType}`,
      );

      // Get access token
      this.logger.log(`[startInspection] Obtaining Scopito access token...`);
      await this.getAccessToken();
      this.logger.log(`[startInspection] Successfully obtained access token`);

      // Make request to Scopito API
      const baseUrl = process.env.SCOPITO_BASE_URL;
      if (!baseUrl) {
        this.logger.error(
          `[startInspection] SCOPITO_BASE_URL environment variable not set`,
        );
        throw new Error("SCOPITO_BASE_URL environment variable not set");
      }

      this.logger.log(
        `[startInspection] Fetching inspections from Scopito API: ${baseUrl}`,
      );
      const inspections = await this.makeRequest(baseUrl);

      // Sort inspections by ID in descending order
      inspections.sort((a: any, b: any) => b.id - a.id);
      this.logger.log(
        `[startInspection] Fetched ${inspections.length} inspections from Scopito API`,
      );

      // Filter inspections by model type and skip specific IDs
      const categoryInspections = inspections.filter(
        (inspection: any) =>
          inspection.modelId === modelType && !this.SKIP_IDS.has(inspection.id),
      );

      this.logger.log(
        `[startInspection] Found ${categoryInspections.length} inspections for model type ${modelType} after filtering`,
      );

      if (categoryInspections.length === 0) {
        this.logger.log(
          `[startInspection] No inspections found for model type ${modelType}`,
        );
        return { success: true, message: "No inspections found" };
      }

      // Log the inspections that will be processed
      this.logger.log(
        `[startInspection] Inspections to process: ${categoryInspections
          .map((i) => i.id)
          .join(", ")}`,
      );

      // Get pending inspections from database
      this.logger.log(
        `[startInspection] Checking for existing pending inspections in database...`,
      );
      const pendingInspections = await this.getScopitoPendingInspections();
      this.logger.log(
        `[startInspection] Found ${pendingInspections.length} pending inspections in database`,
      );

      if (pendingInspections.length === 0) {
        this.logger.log(
          `[startInspection] No pending inspections found, adding new inspections to database`,
        );
        // Add new inspections to database
        const result = await this.addNewScopitoInspections(categoryInspections);
        if (!result.success) {
          this.logger.error(
            `[startInspection] Failed to add new inspections: ${result.message}`,
          );
          return {
            success: false,
            message: "Error adding new inspections to database",
          };
        }

        // Start processing the queue
        this.logger.log(`[startInspection] Starting job processing...`);
        await this.inspectService.processNextJob();

        this.logger.log(
          `[startInspection] Successfully added new inspections and started processing`,
        );
        return {
          success: true,
          message:
            "No pending inspections found, new inspection added and processing started",
        };
      }

      // Create a set of pending inspection IDs for quick lookup
      const pendingIds = new Set(
        pendingInspections.map(
          (inspection: any) => inspection.scopitoProjectId,
        ),
      );

      this.logger.log(
        `[startInspection] Pending inspection IDs: ${Array.from(
          pendingIds,
        ).join(", ")}`,
      );

      // Filter inspections to find those not in pending_inspections
      const toBeInspected = categoryInspections.filter(
        (inspection: any) => !pendingIds.has(inspection.id),
      );

      this.logger.log(
        `[startInspection] New inspections to be added: ${toBeInspected.length}`,
      );

      if (toBeInspected.length > 0) {
        this.logger.log(
          `[startInspection] Adding ${
            toBeInspected.length
          } new inspections: ${toBeInspected.map((i) => i.id).join(", ")}`,
        );

        const result = await this.addNewScopitoInspections(toBeInspected);
        if (!result.success) {
          this.logger.error(
            `[startInspection] Failed to add new inspections: ${result.message}`,
          );
          return { success: false, message: result.message };
        }

        // Check if we need to start processing (if no jobs are currently running)
        this.logger.log(
          `[startInspection] Checking if any jobs are currently running...`,
        );
        const isRunning = await this.inspectService.isJobRunning();
        this.logger.log(
          `[startInspection] Job currently running: ${isRunning}`,
        );

        if (!isRunning) {
          this.logger.log(
            `[startInspection] No jobs running, starting next job processing...`,
          );
          await this.inspectService.processNextJob();
        } else {
          this.logger.log(
            `[startInspection] Job already running, new inspections added to queue`,
          );
        }
      } else {
        this.logger.log(
          `[startInspection] No new inspections to add, all are already in queue`,
        );
      }

      this.logger.log(
        `[startInspection] Successfully completed inspection startup process`,
      );
      return { success: true, message: "Tasks added to the queue" };
    } catch (error) {
      this.logger.error(
        `[startInspection] Error starting inspection: ${error.message}`,
      );
      this.logger.error(`[startInspection] Stack trace: ${error.stack}`);
      throw new HttpException(
        { message: `Failed to start inspection: ${error.message}` },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getInspectionStatus(scopitoProjectId?: number): Promise<any> {
    try {
      if (scopitoProjectId) {
        return await this.prisma.drospectInspection.findFirst({
          where: {
            scopitoProjectId: scopitoProjectId,
            source: "SCOPITO",
          },
        });
      } else {
        return await this.prisma.drospectInspection.findMany({
          where: { source: "SCOPITO" },
          orderBy: { createdAt: "desc" },
        });
      }
    } catch (error) {
      this.logger.error(`Error getting inspection status: ${error.message}`);
      throw new HttpException(
        { message: "Failed to get inspection status" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getInspectionStatistics(scopitoProjectId?: number): Promise<any> {
    try {
      if (scopitoProjectId) {
        const inspection = await this.prisma.drospectInspection.findFirst({
          where: {
            scopitoProjectId: scopitoProjectId,
            source: "SCOPITO",
            status: { in: ["completed", "failed"] }, // Only completed or failed jobs have statistics
          },
          select: {
            id: true,
            scopitoProjectId: true,
            status: true,
            model: true,
            totalImages: true,
            rgbImages: true,
            thermalImages: true,
            healthyImages: true,
            unhealthyImages: true,
            processedImages: true,
            processingDetails: true,
            errorMessage: true,
            processingEfficiency: true,
            startedAt: true,
            completedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!inspection) {
          return null;
        }

        // Calculate additional statistics
        const additionalStats = {
          processingTimeMinutes:
            inspection.startedAt && inspection.completedAt
              ? Math.round(
                  (new Date(inspection.completedAt).getTime() -
                    new Date(inspection.startedAt).getTime()) /
                    (1000 * 60),
                )
              : null,
          imageTypeDistribution:
            inspection.rgbImages && inspection.thermalImages
              ? {
                  rgbPercentage: (
                    (inspection.rgbImages / inspection.totalImages) *
                    100
                  ).toFixed(1),
                  thermalPercentage: (
                    (inspection.thermalImages / inspection.totalImages) *
                    100
                  ).toFixed(1),
                }
              : null,
          healthDistribution:
            inspection.healthyImages && inspection.unhealthyImages
              ? {
                  healthyPercentage: (
                    (inspection.healthyImages /
                      (inspection.healthyImages + inspection.unhealthyImages)) *
                    100
                  ).toFixed(1),
                  unhealthyPercentage: (
                    (inspection.unhealthyImages /
                      (inspection.healthyImages + inspection.unhealthyImages)) *
                    100
                  ).toFixed(1),
                }
              : null,
        };

        return {
          ...inspection,
          ...additionalStats,
        };
      } else {
        // Get all completed inspections with statistics
        return await this.prisma.drospectInspection.findMany({
          where: {
            source: "SCOPITO",
            status: { in: ["completed", "failed"] },
          },
          select: {
            id: true,
            scopitoProjectId: true,
            status: true,
            model: true,
            totalImages: true,
            rgbImages: true,
            thermalImages: true,
            healthyImages: true,
            unhealthyImages: true,
            processedImages: true,
            processingEfficiency: true,
            startedAt: true,
            completedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        });
      }
    } catch (error) {
      this.logger.error(
        `Error getting inspection statistics: ${error.message}`,
      );
      throw new HttpException(
        { message: "Failed to get inspection statistics" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateStatusWithStatistics(
    scopitoProjectId: number,
    status: "COMPLETED" | "FAILED",
    imageStatistics?: ImageStatisticsDto,
    processingDetails?: string,
    errorMessage?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(
        `[updateStatusWithStatistics] Updating status for Scopito project ${scopitoProjectId} to ${status}`,
      );

      // Log detailed image statistics if provided
      if (imageStatistics) {
        this.logger.log(
          `[updateStatusWithStatistics] Detailed Image Statistics:
          📊 Total Images Processed: ${imageStatistics.totalImages}
          🖼️  RGB Images: ${imageStatistics.rgbImages || "Not provided"}
          🌡️  Thermal Images: ${imageStatistics.thermalImages || "Not provided"}
          ✅ Healthy Images: ${imageStatistics.healthyImages || "Not provided"}
          ❌ Unhealthy Images: ${
            imageStatistics.unhealthyImages || "Not provided"
          }
          ⚙️  Successfully Processed: ${
            imageStatistics.processedImages || "Not provided"
          }`,
        );

        // Calculate processing efficiency if we have the data
        if (
          imageStatistics.processedImages &&
          imageStatistics.totalImages > 0
        ) {
          const efficiency = (
            (imageStatistics.processedImages / imageStatistics.totalImages) *
            100
          ).toFixed(2);
          this.logger.log(
            `[updateStatusWithStatistics] Processing Efficiency: ${efficiency}%`,
          );
        }

        // Log image type distribution if we have the data
        if (
          imageStatistics.rgbImages !== undefined &&
          imageStatistics.thermalImages !== undefined
        ) {
          this.logger.log(
            `[updateStatusWithStatistics] Image Type Distribution:
            - RGB: ${(
              (imageStatistics.rgbImages / imageStatistics.totalImages) *
              100
            ).toFixed(1)}%
            - Thermal: ${(
              (imageStatistics.thermalImages / imageStatistics.totalImages) *
              100
            ).toFixed(1)}%`,
          );
        }

        // Log health distribution if we have the data
        if (
          imageStatistics.healthyImages !== undefined &&
          imageStatistics.unhealthyImages !== undefined
        ) {
          const totalAnalyzed =
            imageStatistics.healthyImages + imageStatistics.unhealthyImages;
          if (totalAnalyzed > 0) {
            this.logger.log(
              `[updateStatusWithStatistics] Health Analysis Results:
              - Healthy: ${imageStatistics.healthyImages} (${(
                (imageStatistics.healthyImages / totalAnalyzed) *
                100
              ).toFixed(1)}%)
              - Unhealthy: ${imageStatistics.unhealthyImages} (${(
                (imageStatistics.unhealthyImages / totalAnalyzed) *
                100
              ).toFixed(1)}%)`,
            );
          }
        }
      }

      // Log processing details if provided
      if (processingDetails) {
        this.logger.log(
          `[updateStatusWithStatistics] Processing Details: ${processingDetails}`,
        );
      }

      // Log error details if status is FAILED
      if (status === "FAILED") {
        this.logger.error(
          `[updateStatusWithStatistics] ❌ Processing FAILED for Scopito project ${scopitoProjectId}`,
        );
        if (errorMessage) {
          this.logger.error(
            `[updateStatusWithStatistics] Error Details: ${errorMessage}`,
          );
        }
      } else {
        this.logger.log(
          `[updateStatusWithStatistics] ✅ Processing COMPLETED successfully for Scopito project ${scopitoProjectId}`,
        );
      }

      // Find the job for this Scopito project
      const job = await this.prisma.drospectInspection.findFirst({
        where: {
          scopitoProjectId: scopitoProjectId,
          source: "SCOPITO",
        },
      });

      if (!job) {
        this.logger.error(
          `[updateStatusWithStatistics] No job found for Scopito project ${scopitoProjectId}`,
        );
        return {
          success: false,
          message: `No job found for Scopito project ${scopitoProjectId}`,
        };
      }

      this.logger.log(
        `[updateStatusWithStatistics] Found job ID ${job.id} for Scopito project ${scopitoProjectId}`,
      );

      // Calculate processing efficiency if we have the data
      let efficiency: number | undefined;
      if (
        imageStatistics?.processedImages &&
        imageStatistics?.totalImages > 0
      ) {
        efficiency =
          (imageStatistics.processedImages / imageStatistics.totalImages) * 100;
      }

      // Calculate healthy images if not provided but we have total and unhealthy
      let healthyImages = imageStatistics?.healthyImages;
      if (
        !healthyImages &&
        imageStatistics?.totalImages &&
        imageStatistics?.unhealthyImages !== undefined
      ) {
        healthyImages =
          imageStatistics.totalImages - imageStatistics.unhealthyImages;
      }

      // Update the job with detailed statistics
      await this.prisma.drospectInspection.update({
        where: { id: job.id },
        data: {
          status: status.toLowerCase(),
          completedAt: new Date(),
          // Save all the statistics fields
          rgbImages: imageStatistics?.rgbImages,
          thermalImages: imageStatistics?.thermalImages,
          healthyImages: healthyImages,
          unhealthyImages: imageStatistics?.unhealthyImages,
          processedImages:
            imageStatistics?.processedImages || imageStatistics?.totalImages,
          processingDetails: processingDetails,
          errorMessage: errorMessage,
          processingEfficiency: efficiency,
          // Update totalImages if provided and different
          ...(imageStatistics?.totalImages &&
            imageStatistics.totalImages !== job.totalImages && {
              totalImages: imageStatistics.totalImages,
            }),
        },
      });

      this.logger.log(
        `[updateStatusWithStatistics] Successfully updated job ${job.id} with status ${status} and detailed statistics`,
      );

      // Continue processing the next job if this one completed or failed
      this.logger.log(
        `[updateStatusWithStatistics] Processing next job in queue...`,
      );
      await this.inspectService.processNextJob();

      // Create success message with statistics summary
      let successMessage = `Scopito inspection ${scopitoProjectId} status updated to ${status}`;
      if (imageStatistics) {
        successMessage += `. Processed ${imageStatistics.totalImages} images`;
        if (imageStatistics.unhealthyImages !== undefined) {
          successMessage += ` (${imageStatistics.unhealthyImages} unhealthy detected)`;
        }
      }

      this.logger.log(
        `[updateStatusWithStatistics] Successfully completed status update and queue processing`,
      );
      return {
        success: true,
        message: successMessage,
      };
    } catch (error) {
      this.logger.error(
        `[updateStatusWithStatistics] Error updating status: ${error.message}`,
      );
      this.logger.error(
        `[updateStatusWithStatistics] Stack trace: ${error.stack}`,
      );
      throw new HttpException(
        { message: "Failed to update inspection status" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateStatus(
    scopitoProjectId: number,
    status: "COMPLETED" | "FAILED",
  ): Promise<{ success: boolean; message: string }> {
    // Keep existing method for backward compatibility
    return this.updateStatusWithStatistics(scopitoProjectId, status);
  }
}
