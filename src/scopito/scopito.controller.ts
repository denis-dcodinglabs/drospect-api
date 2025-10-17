/**
 * Scopito Controller - Enhanced Image Processing Status Updates
 *
 * This controller handles Scopito integration and status updates with detailed image processing statistics.
 *
 * Enhanced Status Update API:
 * POST /scopito/update-status
 *
 * Request Body Example:
 * {
 *   "inspectionId": 12345,
 *   "status": "COMPLETED",
 *   "imageStatistics": {
 *     "totalImages": 150,
 *     "rgbImages": 75,
 *     "thermalImages": 75,
 *     "healthyImages": 130,
 *     "unhealthyImages": 20,
 *     "processedImages": 150
 *   },
 *   "processingDetails": "High-resolution thermal analysis completed with advanced AI models",
 *   "errorMessage": null
 * }
 *
 * Failed Processing Example:
 * {
 *   "inspectionId": 12345,
 *   "status": "FAILED",
 *   "imageStatistics": {
 *     "totalImages": 150,
 *     "processedImages": 45
 *   },
 *   "errorMessage": "Processing failed due to insufficient image quality in thermal images"
 * }
 */

import {
  Controller,
  Post,
  Get,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  UseGuards,
} from "@nestjs/common";
import { ScopitoService } from "./scopito.service";
import { ScopitoStatusUpdateDto } from "./dto/scopito-status.dto";

// Custom auth guard for static token
export class ScopitoTokenGuard {
  private readonly STATIC_TOKEN = "1da18cbb74b13e32f94d6f0490912461";

  canActivate(context: any): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers["authorization"];

    if (!authHeader || authHeader !== `Bearer ${this.STATIC_TOKEN}`) {
      throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);
    }

    return true;
  }
}

@Controller("scopito")
export class ScopitoController {
  private readonly logger = new Logger(ScopitoController.name);

  constructor(private readonly scopitoService: ScopitoService) {}

  @Get()
  async healthCheck(): Promise<{ message: string }> {
    return { message: "Scopito service is running" };
  }

  @Post("high")
  async highModel(): Promise<{ message: string }> {
    try {
      this.logger.log(
        "[POST /scopito/high] Starting HIGH model inspection request (modelType: 74)",
      );
      const result = await this.scopitoService.startInspection(74);

      if (result.success) {
        this.logger.log(`[POST /scopito/high] SUCCESS: ${result.message}`);
        return { message: result.message };
      } else {
        this.logger.error(`[POST /scopito/high] FAILED: ${result.message}`);
        throw new HttpException(
          { message: result.message },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      this.logger.error(`[POST /scopito/high] ERROR: ${error.message}`);
      this.logger.error(`[POST /scopito/high] Stack trace: ${error.stack}`);
      throw new HttpException(
        { message: error.message || "Internal server error" },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("low")
  async lowModel(): Promise<{ message: string }> {
    try {
      this.logger.log(
        "[POST /scopito/low] Starting LOW model inspection request (modelType: 75)",
      );
      const result = await this.scopitoService.startInspection(75);

      if (result.success) {
        this.logger.log(`[POST /scopito/low] SUCCESS: ${result.message}`);
        return { message: result.message };
      } else {
        this.logger.error(`[POST /scopito/low] FAILED: ${result.message}`);
        throw new HttpException(
          { message: result.message },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      this.logger.error(`[POST /scopito/low] ERROR: ${error.message}`);
      this.logger.error(`[POST /scopito/low] Stack trace: ${error.stack}`);
      throw new HttpException(
        { message: error.message || "Internal server error" },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("status/:id?")
  async getInspectionStatus(@Param("id") id?: string): Promise<any> {
    try {
      const inspectionId = id ? parseInt(id) : undefined;
      this.logger.log(
        `[GET /scopito/status] Getting inspection status for ID: ${
          inspectionId || "ALL"
        }`,
      );

      const result = await this.scopitoService.getInspectionStatus(
        inspectionId,
      );

      this.logger.log(
        `[GET /scopito/status] Successfully retrieved status for ID: ${
          inspectionId || "ALL"
        }`,
      );
      return result;
    } catch (error) {
      this.logger.error(`[GET /scopito/status] ERROR: ${error.message}`);
      this.logger.error(`[GET /scopito/status] Stack trace: ${error.stack}`);
      throw new HttpException(
        { message: error.message || "Failed to get inspection status" },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("statistics/:id?")
  async getInspectionStatistics(@Param("id") id?: string): Promise<any> {
    try {
      const inspectionId = id ? parseInt(id) : undefined;
      this.logger.log(
        `[GET /scopito/statistics] Getting detailed inspection statistics for ID: ${
          inspectionId || "ALL"
        }`,
      );

      const result = await this.scopitoService.getInspectionStatistics(
        inspectionId,
      );

      if (!result) {
        this.logger.log(
          `[GET /scopito/statistics] No statistics found for ID: ${inspectionId}`,
        );
        throw new HttpException(
          { message: `No completed inspection found for ID: ${inspectionId}` },
          HttpStatus.NOT_FOUND,
        );
      }

      this.logger.log(
        `[GET /scopito/statistics] Successfully retrieved statistics for ID: ${
          inspectionId || "ALL"
        }`,
      );
      return result;
    } catch (error) {
      this.logger.error(`[GET /scopito/statistics] ERROR: ${error.message}`);
      this.logger.error(
        `[GET /scopito/statistics] Stack trace: ${error.stack}`,
      );
      throw new HttpException(
        { message: error.message || "Failed to get inspection statistics" },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("update-status")
  async updateStatus(
    @Body() data: ScopitoStatusUpdateDto,
  ): Promise<{ message: string }> {
    try {
      this.logger.log(
        `[POST /scopito/update-status] Updating status for Scopito project ${data.inspectionId} to ${data.status}`,
      );

      // Log image statistics if provided (check both statistics and imageStatistics fields)
      const statsForLogging = data.statistics || data.imageStatistics;
      if (statsForLogging) {
        this.logger.log(
          `[POST /scopito/update-status] Image Processing Statistics for project ${
            data.inspectionId
          }:
          - Total Images: ${statsForLogging.totalImages}
          - RGB Images: ${statsForLogging.rgbImages || "N/A"}
          - Thermal Images: ${statsForLogging.thermalImages || "N/A"}
          - Healthy Images: ${statsForLogging.healthyImages || "N/A"}
          - Unhealthy Images: ${statsForLogging.unhealthyImages || "N/A"}
          - Processed Images: ${statsForLogging.processedImages || "N/A"}`,
        );
      }

      // Log processing details if provided
      if (data.processingDetails) {
        this.logger.log(
          `[POST /scopito/update-status] Processing Details: ${data.processingDetails}`,
        );
      }

      // Log error message if status is FAILED and error message provided
      if (data.status === "FAILED" && data.errorMessage) {
        this.logger.error(
          `[POST /scopito/update-status] Error Message: ${data.errorMessage}`,
        );
      }

      if (!data.inspectionId || !data.status) {
        this.logger.error(
          `[POST /scopito/update-status] Missing required fields: inspectionId=${data.inspectionId}, status=${data.status}`,
        );
        throw new HttpException(
          { message: "Inspection ID and status are required" },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!["COMPLETED", "FAILED"].includes(data.status)) {
        this.logger.error(
          `[POST /scopito/update-status] Invalid status: ${data.status}. Must be COMPLETED or FAILED`,
        );
        throw new HttpException(
          { message: 'Status must be either "COMPLETED" or "FAILED"' },
          HttpStatus.BAD_REQUEST,
        );
      }

      // The inspectionId from Python script is actually the Scopito project ID
      // Use statistics field if provided, otherwise fall back to imageStatistics
      const statsForUpdate = data.statistics || data.imageStatistics;

      const result = await this.scopitoService.updateStatusWithStatistics(
        data.inspectionId, // This is the scopitoProjectId
        data.status,
        statsForUpdate,
        data.processingDetails,
        data.errorMessage,
      );

      if (result.success) {
        this.logger.log(
          `[POST /scopito/update-status] SUCCESS: ${result.message}`,
        );
        return { message: result.message };
      } else {
        this.logger.error(
          `[POST /scopito/update-status] FAILED: ${result.message}`,
        );
        throw new HttpException(
          { message: result.message },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      this.logger.error(
        `[POST /scopito/update-status] ERROR: ${error.message}`,
      );
      this.logger.error(
        `[POST /scopito/update-status] Stack trace: ${error.stack}`,
      );
      throw new HttpException(
        { message: error.message || "Failed to update status" },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("shutdown")
  @UseGuards(ScopitoTokenGuard)
  async shutdown(): Promise<{ message: string }> {
    this.logger.log("Shutdown endpoint called");
    return { message: "Worker thread has been shut down" };
  }
}
