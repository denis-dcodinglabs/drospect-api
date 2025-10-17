import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { Multer } from "multer";
import { FilesInterceptor } from "@nestjs/platform-express";
import { GcsUploadService } from "./storage.service";
import { PrismaService } from "src/prisma.service";
import { ProjectService } from "src/project/project.service";
import { JwtOrApiKeyAuthGuard } from "src/authentication/jwt-or-apikey-auth.guard";
import { JwtAuthGuard } from "src/authentication/auth.guard";

@Controller("/projects/upload")
export class GcsUploadController {
  private projectService: ProjectService;

  constructor(private readonly uploadService: GcsUploadService) {
    this.projectService = new ProjectService(new PrismaService());
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor("files"))
  async uploadFiles(
    @UploadedFiles() files: Multer.File[],
    @Body("id") Id: number,
    @Body("properties") properties: string,
  ): Promise<{
    status: string;
    data: {
      totalFiles: number;
      successfulUploads: number;
      failedUploads: number;
      errors: Array<{ filename: string; error: string }>;
      processingTime?: number;
    };
  }> {
    if (!files || files.length === 0) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "There are no files",
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const bucketName = process.env.GCS_BUCKET_NAME;
      const parsedProperties = JSON.parse(properties);
      const uploadResult = await this.uploadService.uploadImages(
        bucketName,
        files,
        +parsedProperties.id,
        { drone: parsedProperties.drone },
      );

      // Wrap the successful response in a data object
      return {
        status: "Ok!",
        data: uploadResult,
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: "There was a problem uploading files",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("/zip")
  @UseGuards(JwtAuthGuard)
  async uploadZip(@Body() body: { id: number }): Promise<{ status: string }> {
    try {
      const bucketName = process.env.GCS_BUCKET_NAME;
      // Fire-and-forget background start; respond immediately
      this.uploadService
        .zipAndUpload(bucketName, body.id + ".zip", +body.id)
        .catch((e) => {
          // Already logged inside service; avoid unhandled rejection
          console.error("Background zip failed:", e?.message || e);
        });
      return { status: "started" };
    } catch (error) {
      console.log(error, "error");
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: "There was a problem uploading files",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Polling endpoint for ZIP status
  @Get("/zip/status/:id")
  @UseGuards(JwtAuthGuard)
  async zipStatus(@Param("id") id: string): Promise<{
    status: "pending" | "in_progress" | "completed";
    url?: string;
  }> {
    try {
      const bucketName = process.env.GCS_BUCKET_NAME;
      return await this.uploadService.getZipStatus(
        bucketName,
        +id,
        id + ".zip",
      );
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: "Failed to get ZIP status",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtOrApiKeyAuthGuard)
  @Post("/panels")
  async uploadUnhealthyPanels(
    @Body()
    body: {
      files: { image: string; imageId: any; panels: any; imageName: string }[];
      healthyPanels?: number[]; // Add healthyPanels array
      id: number;
    },
  ): Promise<{ status: string; data: { imagecounter: string[][] } }> {
    try {
      const bucketName = process.env.GCS_BUCKET_NAME;
      const data = await this.uploadService.uploadUnhealthyPanels(
        bucketName,
        body.files,
        body.id,
        body.healthyPanels, // Pass healthyPanels to service
      );

      // Wrap the successful response in a data object
      return {
        status: "Ok!",
        data: {
          imagecounter: data,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: "There was a problem uploading files",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
