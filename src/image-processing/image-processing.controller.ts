import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  UseGuards,
  Req,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "src/authentication/auth.guard";
import { CloudRunApiService } from "src/helpers/cloud-run-api-helper";
import { ImageService } from "src/images/image.service";
import { MailService } from "src/helpers/mail-helper";
import { WalletService } from "src/wallet/wallet.service";
import { ProjectService } from "src/project/project.service";
import { ImageProcessingPostService } from "src/helpers/image-processing-post-helper";
import { getSubIdFromToken } from "src/decodedToken/getSubIdFromToken";

@Controller("/image-processing")
export class ImageProcessingController {
  constructor(
    private readonly cloudRunApiService: CloudRunApiService,
    private readonly imageService: ImageService,
    private readonly mailService: MailService,
    private readonly walletService: WalletService,
    private readonly projectService: ProjectService,
    private readonly imageProcessingPostService: ImageProcessingPostService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post("/cloud-run")
  async testCloudRunApiService(
    @Body()
    data: {
      id: number;
      numberOfFiles: number;
      altitude: string;
      selectedImages?: any[];
    },
  ): Promise<{ status: string; data: any }> {
    try {
      // Use the same image selection logic as the main endpoint
      if (!data.selectedImages) {
        const allImages = await this.imageService.getImagesbyId(
          1,
          data.numberOfFiles,
          data.id,
          undefined,
          false,
          undefined,
          false,
        );
        const extractedImages = allImages.images.map((image) => ({
          imageId: (image as any).id,
          imageUrl: image.image,
          imageName: (image as any).imageName,
        }));
        data.selectedImages = extractedImages;
      }

      console.log("🧪 Testing Cloud Run API service with data:", {
        projectId: data.id,
        limit: data.numberOfFiles,
        altitude: data.altitude,
        imagesCount: data.selectedImages?.length || 0,
      });

      // Use the new service that mirrors the working test script
      const response = await this.cloudRunApiService.callImageInspectAPI({
        projectId: data.id,
        limit: data.numberOfFiles,
        altitude: data.altitude,
        imagesData: data.selectedImages,
      });

      return {
        status: "Ok!",
        data: {
          message: "Cloud Run API service test successful",
          response: response,
          testedWith: {
            projectId: data.id,
            numberOfFiles: data.numberOfFiles,
            altitude: data.altitude,
            imagesCount: data.selectedImages?.length || 0,
          },
        },
      };
    } catch (error) {
      console.error("Cloud Run API service test failed:", error);
      throw new HttpException(
        error.response || error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get("/cloud-run-simple")
  async testCloudRunApiServiceSimple(): Promise<{ status: string; data: any }> {
    // Simple GET version for browser testing with hardcoded data
    const testData = {
      id: 281,
      numberOfFiles: 1,
      altitude: "LOW",
    };

    try {
      const allImages = await this.imageService.getImagesbyId(
        1,
        testData.numberOfFiles,
        testData.id,
        undefined,
        false,
        undefined,
        false,
      );
      const extractedImages = allImages.images.map((image) => ({
        imageId: (image as any).id,
        imageUrl: image.image,
        imageName: (image as any).imageName,
      }));

      console.log("🧪 Testing Cloud Run API service (GET version) with data:", {
        projectId: testData.id,
        limit: testData.numberOfFiles,
        altitude: testData.altitude,
        imagesCount: extractedImages?.length || 0,
      });

      const response = await this.cloudRunApiService.callImageInspectAPI({
        projectId: testData.id,
        limit: testData.numberOfFiles,
        altitude: testData.altitude,
        imagesData: extractedImages,
      });

      return {
        status: "Ok!",
        data: {
          message: "Cloud Run API service test successful (Simple GET)",
          response: response,
          testedWith: {
            projectId: testData.id,
            numberOfFiles: testData.numberOfFiles,
            altitude: testData.altitude,
            imagesCount: extractedImages?.length || 0,
          },
        },
      };
    } catch (error) {
      console.error("Cloud Run API service test failed:", error);
      throw new HttpException(
        error.response || error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post("/process-complete")
  async processCompleteWorkflow(
    @Req() request: Request,
    @Body()
    data: {
      id: number;
      projectName: string;
      numberOfFiles: number;
      altitude: string;
      drone: any;
      selectedImages?: any[];
    },
  ): Promise<{ status: string; data: any }> {
    try {
      // Use the same image selection logic as the main endpoint
      if (!data.selectedImages) {
        const allImages = await this.imageService.getImagesbyId(
          1,
          data.numberOfFiles,
          data.id,
          undefined,
          false,
          undefined,
          false,
        );
        const extractedImages = allImages.images.map((image) => ({
          imageId: (image as any).id,
          imageUrl: image.image,
          imageName: (image as any).imageName,
        }));
        data.selectedImages = extractedImages;
      }

      console.log("🚀 Starting complete image processing workflow:", {
        projectId: data.id,
        limit: data.numberOfFiles,
        altitude: data.altitude,
        imagesCount: data.selectedImages?.length || 0,
      });

      // Call Cloud Run API
      const response = await this.cloudRunApiService.callImageInspectAPI({
        projectId: data.id,
        limit: data.numberOfFiles,
        altitude: data.altitude,
        imagesData: data.selectedImages,
      });

      console.log(
        "✅ Cloud Run API call successful, starting post-processing...",
      );

      // Get user ID from token for credit deduction
      const authorizationHeader = request.headers["authorization"];
      const subId = getSubIdFromToken(authorizationHeader);

      // Handle post-processing (email, credits, project status)
      await this.imageProcessingPostService.handlePostProcessing({
        projectId: data.id,
        projectName: data.projectName,
        numberOfFiles: data.numberOfFiles,
        altitude: data.altitude,
        drone: data.drone,
        subId: subId,
      });

      console.log("🎉 Complete workflow finished successfully");

      return {
        status: "Ok!",
        data: {
          message: "Complete image processing workflow successful",
          cloudRunResponse: response,
          postProcessing: {
            emailSent: true,
            creditsDeducted: true,
            projectMarkedAsInspected: true,
          },
          processedWith: {
            projectId: data.id,
            projectName: data.projectName,
            numberOfFiles: data.numberOfFiles,
            altitude: data.altitude,
            imagesCount: data.selectedImages?.length || 0,
          },
        },
      };
    } catch (error) {
      console.error("❌ Complete workflow failed:", error);
      throw new HttpException(
        error.response || error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("/info")
  async getTestInfo(): Promise<{ status: string; data: any }> {
    return {
      status: "Ok!",
      data: {
        message: "Image Processing Controller Info",
        availableEndpoints: [
          "POST /api/image-processing/cloud-run - Test Cloud Run API with custom data",
          "GET /api/image-processing/cloud-run-simple - Test Cloud Run API with default data",
          "POST /api/image-processing/process-complete - Complete workflow: Cloud Run API + post-processing",
          "GET /api/image-processing/info - This endpoint",
        ],
        description:
          "This controller is dedicated to image processing and API integrations",
        lastUpdated: new Date().toISOString(),
      },
    };
  }
}
