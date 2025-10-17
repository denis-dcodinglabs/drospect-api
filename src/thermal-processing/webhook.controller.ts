import { Controller, Post, Param, Body, Logger } from "@nestjs/common";
import { ThermalProcessingService } from "./thermal-processing.service";

@Controller("webhook")
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private thermalProcessingService: ThermalProcessingService) {}

  /**
   * Handle webhook completion from NodeODM when orthomosaic processing is finished
   * POST /webhook/orthomosaic/:taskId/end
   */
  @Post("orthomosaic/:taskId/end")
  async handleWebhookCompletion(
    @Param("taskId") taskId: string,
    @Body() body: any, // NodeODM webhook payload
  ): Promise<{ success: boolean; resultUrl?: string }> {
    try {
      this.logger.log(
        `Received webhook completion for task ${taskId} from NodeODM`,
      );

      // Log webhook payload for debugging
      this.logger.debug(`Webhook payload: ${JSON.stringify(body)}`);

      // Handle the webhook completion
      return await this.thermalProcessingService.handleWebhookCompletion(
        taskId,
      );
    } catch (error) {
      this.logger.error("Failed to handle webhook completion:", error);
      throw error;
    }
  }
}
