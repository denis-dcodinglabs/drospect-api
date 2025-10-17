import { Injectable } from "@nestjs/common";
import { MailService } from "./mail-helper";
import { WalletService } from "src/wallet/wallet.service";
import { ProjectService } from "src/project/project.service";

interface PostProcessingData {
  projectId: number;
  projectName: string;
  numberOfFiles: number;
  altitude: string;
  drone: any;
  subId: string;
}

@Injectable()
export class ImageProcessingPostService {
  constructor(
    private readonly mailService: MailService,
    private readonly walletService: WalletService,
    private readonly projectService: ProjectService,
  ) {}

  async handlePostProcessing(data: PostProcessingData): Promise<void> {
    const { projectId, projectName, numberOfFiles, altitude, drone, subId } =
      data;

    // Deduct credits from wallet
    await this.walletService.checkAndDeductCredits(
      subId,
      numberOfFiles,
      altitude,
      projectId,
      projectName,
    );
    // Send email notification
    await this.mailService.mailImageTrigger(
      projectId,
      projectName,
      numberOfFiles,
      drone,
    );

    // Note: Project inspection status is now handled per-image with processingStatus
    // No longer marking entire project as inspected
  }
}
