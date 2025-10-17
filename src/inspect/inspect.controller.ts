import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { InspectService } from "./inspect.service";

@Controller("inspect")
export class InspectController {
  private readonly logger = new Logger(InspectController.name);

  constructor(private readonly inspectService: InspectService) {}

  @Post("update-status")
  async updateJobStatus(
    @Body() data: { projectId: number; status: "completed" | "failed" },
  ): Promise<{ status: string; message: string; jobId: number }> {
    try {
      this.logger.log(
        `Updating job status for project ${data.projectId} to ${data.status}`,
      );

      if (!data.projectId || !data.status) {
        throw new HttpException(
          { message: "Project ID and status are required" },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!["completed", "failed"].includes(data.status)) {
        throw new HttpException(
          { message: 'Status must be either "completed" or "failed"' },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Update job status and send email notification if completed
      const result =
        await this.inspectService.updateJobStatusWithEmailNotification(
          data.projectId,
          data.status,
        );

      // If the job was completed or failed, process the next job
      if (data.status === "completed" || data.status === "failed") {
        this.logger.log(
          `Processing next job in queue after ${data.status} status update`,
        );
        await this.inspectService.processNextJob();
      }

      return {
        status: "success",
        message: `Job status updated to ${data.status}`,
        jobId: result.jobId,
      };
    } catch (error) {
      this.logger.error(`Error updating job status: ${error.message}`);
      throw new HttpException(
        { message: error.message || "Failed to update job status" },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
