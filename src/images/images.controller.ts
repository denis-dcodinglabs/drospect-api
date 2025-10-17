// ImageController.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ImageService } from "./image.service";
import { JwtOrApiKeyAuthGuard } from "src/authentication/jwt-or-apikey-auth.guard";
import { JwtAuthGuard } from "src/authentication/auth.guard";
import { FilterDuplicatesDto } from "./dto/duplicate-filter.dto";
import { GcsUploadService } from "src/googleStorage/storage.service";
import { PrismaService } from "src/prisma.service";

@Controller("/projects/images")
export class ImagesController {
  constructor(
    private readonly imageService: ImageService,
    private readonly uploadService: GcsUploadService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtOrApiKeyAuthGuard)
  @Get(":id")
  async getImages(
    @Param("id") projectId: number,
    @Query("page") page: number,
    @Query("limit") limit: number,
    @Query("isHealthy") isHealthy: boolean,
    @Query("isInspected") isInspected: boolean,
    @Query("searchTerm") searchTerm: string,
    @Query("isRgb") isRgb: boolean,
  ): Promise<{ status: string; data: { images: any; moreImages: boolean } }> {
    try {
      const result = await this.imageService.getImagesbyId(
        page,
        limit,
        +projectId,
        isHealthy,
        isInspected,
        searchTerm,
        isRgb,
      );
      return { status: "Ok!", data: result };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: "There was a problem getting images",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(":id")
  async updateImage(
    @Param("id") imageId: number,
    @Body() postData: any,
  ): Promise<{ status: string; data: any }> {
    try {
      if (postData?.isFixed) {
        try {
          await this.imageService.PanelStatistics(
            postData?.projectId,
            0,
            -1,
            true,
          );
        } catch (error) {
          console.error("Error updating panel statistics:", error);
        }
      }
      const result = await this.imageService.updateImage(+imageId, postData);
      return { status: "Ok!", data: result };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: "There was a problem updating the image",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtOrApiKeyAuthGuard)
  @Post("search")
  async searchImages(
    @Body()
    body: {
      projectId: number;
      searchTerm: string;
      isHealthy?: boolean;
      isInspected?: boolean;
    },
  ): Promise<{ status: string; data: { images: any[] } }> {
    const { projectId, searchTerm, isHealthy, isInspected } = body;
    try {
      const result = await this.imageService.searchImagesByName(
        projectId,
        searchTerm,
        isHealthy,
        isInspected,
      );
      return { status: "Ok!", data: { images: result } };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: "There was a problem searching for images",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete("/delete")
  async deleteImages(
    @Body()
    body: {
      imageId?: number;
      image?: string;
      images?: {
        imageId: number;
        imageUrl: string;
        imageName: string;
        rgb?: boolean;
      }[];
    },
  ): Promise<{ status: string; message: string }> {
    let ids: number[] = [];

    if (body.imageId) {
      ids.push(body.imageId);
      // rgbFlags.push(false); // No longer needed
    }

    if (body.images && Array.isArray(body.images)) {
      ids = ids.concat(body.images.map((image) => image.imageId));
      // rgbFlags = rgbFlags.concat(
      //   body.images.map((image) => image.rgb || false),
      // );
    }

    try {
      // Determine project ID from the first image (all images are same project)
      const images = await this.prisma.images.findMany({
        where: { id: { in: ids } },
        select: { projectId: true },
        take: 1,
      });
      const projectId = images[0]?.projectId;

      await this.imageService.DeleteImages(ids); // Only pass ids now

      // Fire-and-forget: trigger fresh ZIP for the project
      if (projectId !== undefined && projectId !== null) {
        const bucketName = process.env.GCS_BUCKET_NAME;
        this.uploadService
          .zipAndUpload(bucketName, `${projectId}.zip`, projectId)
          .catch(() => {});
      }

      return { status: "Ok!", message: "Images deleted successfully." };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return { status: "Error", message: "One or more images do not exist." };
      }
      return {
        status: "Error",
        message: error.message || "An error occurred while deleting images.",
      };
    }
  }

  @UseGuards(JwtOrApiKeyAuthGuard)
  @Post("duplicates/analyze")
  async analyzeDuplicates(@Body() filterDto: FilterDuplicatesDto): Promise<{
    status: string;
    data: {
      filteredImages: any[];
      duplicateGroups: any[];
      stats: {
        totalImages: number;
        duplicatesRemoved: number;
        groupsFound: number;
      };
    };
  }> {
    try {
      const result = await this.imageService.filterDuplicateImages(filterDto);
      return { status: "Ok!", data: result };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: "There was a problem analyzing duplicate images",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
