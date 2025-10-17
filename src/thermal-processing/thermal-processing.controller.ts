import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  BadRequestException,
  Logger,
  UseGuards,
  Req,
  Request,
} from "@nestjs/common";
import {
  ThermalProcessingService,
  ThermalTaskStatus,
} from "./thermal-processing.service";
import { JwtOrApiKeyAuthGuard } from "../authentication/jwt-or-apikey-auth.guard";
import { getSubIdFromToken } from "../decodedToken/getSubIdFromToken";
import { NodeOdmOptions } from "./nodeodm.service";

@Controller("orthomosaic-processing")
@UseGuards(JwtOrApiKeyAuthGuard)
export class ThermalProcessingController {
  private readonly logger = new Logger(ThermalProcessingController.name);

  constructor(private thermalProcessingService: ThermalProcessingService) {}

  /**
   * Start thermal processing with existing project images and selected model
   * POST /orthomosaic-processing/:projectId/start
   */
  @Post(":projectId/start")
  async startThermalProcessingWithModel(
    @Param("projectId") projectId: string,
    @Body() body: { model: string; options?: NodeOdmOptions; webhook: string },
    @Req() request: Request,
  ): Promise<ThermalTaskStatus> {
    try {
      this.logger.log(
        `Starting thermal processing with model ${body.model} for project ${projectId}`,
      );

      if (!body.model) {
        throw new BadRequestException("Model selection is required");
      }

      // Extract user ID from JWT token
      const authorizationHeader = request.headers["authorization"];
      const userId = getSubIdFromToken(authorizationHeader);

      return await this.thermalProcessingService.startThermalProcessingWithModel(
        parseInt(projectId, 10),
        body.model,
        body.options || {},
        userId,
        body.options.webhook,
      );
    } catch (error) {
      this.logger.error("Failed to start thermal processing:", error);
      throw error;
    }
  }

  /**
   * Get thermal processing task status
   * GET /orthomosaic-processing/:taskId/status
   */
  @Get(":taskId/status")
  async getTaskStatus(
    @Param("taskId") taskId: string,
  ): Promise<ThermalTaskStatus> {
    try {
      return await this.thermalProcessingService.getTaskStatus(taskId);
    } catch (error) {
      this.logger.error(`Failed to get task status for ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Get all thermal processing tasks for a project
   * GET /orthomosaic-processing/:projectId/project
   */
  @Get(":projectId/project")
  async getProjectThermalTasks(
    @Param("projectId") projectId: string,
  ): Promise<ThermalTaskStatus[]> {
    try {
      return await this.thermalProcessingService.getProjectThermalTasks(
        parseInt(projectId, 10),
      );
    } catch (error) {
      this.logger.error(
        `Failed to get thermal tasks for project ${projectId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get thermal processing task result
   * GET /orthomosaic-processing/:taskId/result
   */
  @Get(":taskId/result")
  async getTaskResult(
    @Param("taskId") taskId: string,
  ): Promise<{ success: boolean; resultUrl?: string }> {
    try {
      return await this.thermalProcessingService.processCompletedTask(taskId);
    } catch (error) {
      this.logger.error(`Failed to get task result for ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel thermal processing task
   * POST /orthomosaic-processing/:taskId/cancel
   */
  @Post(":taskId/cancel")
  async cancelTask(
    @Param("taskId") taskId: string,
  ): Promise<{ success: boolean }> {
    try {
      const success = await this.thermalProcessingService.cancelTask(taskId);
      return { success };
    } catch (error) {
      this.logger.error(`Failed to cancel task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Mark task as failed
   * POST /orthomosaic-processing/:taskId/fail
   */
  @Post(":taskId/fail")
  async markTaskAsFailed(
    @Param("taskId") taskId: string,
    @Body() body: { errorMessage: string; status: string },
  ): Promise<{ success: boolean }> {
    try {
      this.logger.log(`Marking task ${taskId} as failed`);
      const success = await this.thermalProcessingService.markTaskAsFailed(
        taskId,
        body.errorMessage,
      );

      // Attempt refund inline for start/download failures; ignored if already refunded
      try {
        await (this.thermalProcessingService as any).refundTaskCreditsById(
          taskId,
          body.errorMessage || "Task marked as failed by frontend",
        );
      } catch (_) {
        // Do not throw; refund is best-effort
      }
      return { success };
    } catch (error) {
      this.logger.error("Failed to mark task as failed:", error);
      throw error;
    }
  }

  /**
   * Upload panel data for a thermal processing task
   * POST /orthomosaic-processing/:taskId/panel-data
   */
  @Post(":taskId/panel-data")
  async uploadPanelData(
    @Param("taskId") taskId: string,
    @Body() body: { panelData: any[] },
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Uploading panel data for task ${taskId}`);

      if (!body.panelData || !Array.isArray(body.panelData)) {
        throw new BadRequestException("panelData must be an array");
      }

      return await this.thermalProcessingService.uploadPanelData(
        taskId,
        body.panelData,
      );
    } catch (error) {
      this.logger.error("Failed to upload panel data:", error);
      throw error;
    }
  }

  /**
   * Get panel data for a thermal processing task
   * GET /orthomosaic-processing/:taskId/panel-data
   */
  @Get(":taskId/panel-data")
  async getPanelData(
    @Param("taskId") taskId: string,
  ): Promise<{ success: boolean; panelData?: any[]; message?: string }> {
    try {
      this.logger.log(`Retrieving panel data for task ${taskId}`);
      return await this.thermalProcessingService.getPanelData(taskId);
    } catch (error) {
      this.logger.error("Failed to retrieve panel data:", error);
      throw error;
    }
  }
}
