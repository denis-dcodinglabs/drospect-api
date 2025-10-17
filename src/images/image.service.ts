import {
  Injectable,
  NotFoundException,
  Logger,
  HttpException,
  HttpStatus,
  Optional,
} from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { ImageDto, PanelInfoDto } from "./image.model";
import {
  FilterDuplicatesDto,
  DuplicateGroup,
} from "./dto/duplicate-filter.dto";
import { DuplicateFilterService } from "./duplicate-filter/duplicate-filter.service";

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);
  private duplicateFilterService: DuplicateFilterService;

  constructor(
    private prisma: PrismaService,
    @Optional() duplicateFilterService?: DuplicateFilterService,
  ) {
    this.duplicateFilterService =
      duplicateFilterService ?? new DuplicateFilterService(prisma);
  }

  private convertToImageDto(image: any): ImageDto {
    let panelInformation: PanelInfoDto[] = [];
    if (image.panelInformation) {
      try {
        // Handle both string and object panel information
        const parsedInfo =
          typeof image.panelInformation === "string"
            ? JSON.parse(image.panelInformation)
            : image.panelInformation;

        if (Array.isArray(parsedInfo)) {
          panelInformation = parsedInfo
            .filter((panel) => {
              // Filter out panels with missing essential data
              return (
                panel &&
                panel.PanelNumber !== undefined &&
                panel.Coordinates &&
                panel.Coordinates.min_x !== undefined &&
                panel.Coordinates.min_y !== undefined &&
                panel.Coordinates.max_x !== undefined &&
                panel.Coordinates.max_y !== undefined
              );
            })
            .map((panel) => {
              // For RGB images with unhealthy panels, remove confidence values
              const isRgbWithUnhealthyPanels = image.rgb && !image.isHealthy;

              if (isRgbWithUnhealthyPanels) {
                // Return panel info without confidence values for RGB unhealthy panels
                return {
                  panelNumber: panel.PanelNumber,
                  coordinates: {
                    min_x: panel.Coordinates.min_x,
                    min_y: panel.Coordinates.min_y,
                    max_x: panel.Coordinates.max_x,
                    max_y: panel.Coordinates.max_y,
                    confidence: 0, // Set confidence to 0 for RGB unhealthy panels
                  },
                  deltaTemp: panel.Delta,
                  avgTemp: panel.AvgTemp,
                  highestTemp: panel.HighestTemp,
                  reasonDetected: panel.ReasonDetected,
                  confidence: 0, // Remove confidence for RGB unhealthy panels
                  highestConfidence: 0,
                  highestReason: null,
                  confidenceValues: {
                    diode: 0,
                    cracking: 0,
                    vegetation: 0,
                    cellHotSpot: 0,
                  },
                  reasonConfidence: 0,
                };
              } else {
                // For thermal images or healthy RGB images, keep confidence values
                const confidenceValues = {
                  diode: panel.DiodeConf || 0,
                  cracking: panel.CrackingConf || 0,
                  vegetation: panel.VegetationConf || 0,
                  cellHotSpot: panel.CellHotSpotConf || 0,
                };

                const maxConfidence = Math.max(
                  ...Object.values(confidenceValues),
                );
                const highestReason = Object.keys(confidenceValues).find(
                  (key) => confidenceValues[key] === maxConfidence,
                );

                return {
                  panelNumber: panel.PanelNumber,
                  coordinates: {
                    min_x: panel.Coordinates.min_x,
                    min_y: panel.Coordinates.min_y,
                    max_x: panel.Coordinates.max_x,
                    max_y: panel.Coordinates.max_y,
                    confidence: panel.Confidence || 0, // Ensure confidence is never undefined
                  },
                  deltaTemp: panel.Delta,
                  avgTemp: panel.AvgTemp,
                  highestTemp: panel.HighestTemp,
                  reasonDetected: panel.ReasonDetected,
                  confidence: Math.min(panel.Confidence || 0, 50), // Cap confidence at 50
                  highestConfidence: maxConfidence,
                  highestReason: highestReason,
                  confidenceValues: confidenceValues,
                  reasonConfidence: panel.ReasonConfidence,
                };
              }
            });
        }
      } catch (e) {
        // Previously logged a warning whenever panel information failed to parse, which caused log noise.
        // Silently ignore malformed panel information and default to an empty array.
      }
    }

    return {
      id: image.id,
      projectId: image.projectId,
      image: image.image,
      thumbnailUrl: image.thumbnailUrl,
      imageName: image.imageName,
      isHealthy: image.isHealthy,
      isInspected: image.isInspected,
      processingStatus: image.processingStatus,
      latitude: image.latitude,
      longitude: image.longitude,
      altitude: image.altitude,
      rgb: image.rgb,
      isFixed: image.isFixed,
      panelInformation,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
      isDeleted: image.isDeleted,
    };
  }

  async addImages(
    urls: string[],
    projectId: number,
    imageNames: string[],
    latitude: string[],
    longitude: string[],
    rgb: boolean[],
    thumbnailUrls?: string[],
  ): Promise<any[]> {
    // Minimal log retained elsewhere; keep DB writes quiet
    const promises = urls.map((url, index) =>
      this.prisma.images.create({
        data: {
          image: url,
          thumbnailUrl: thumbnailUrls ? thumbnailUrls[index] : null,
          imageName: imageNames[index],
          latitude: +latitude[index],
          longitude: +longitude[index],
          rgb: rgb[index],
          project: {
            connect: {
              id: projectId,
            },
          },
        },
      }),
    );

    const savedImages = await this.prisma.$transaction(promises);

    // Removed verbose per-image debug logs

    // Check if any image is thermal (not rgb)
    const hasThermalImage = rgb.some((isRgb) => !isRgb);
    if (hasThermalImage) {
      // Update project's allrgb field to false if any thermal image is found
      // Note: allrgb property may need to be added to Prisma schema if not exists
      await this.prisma.project.update({
        where: { id: projectId },
        data: { allrgb: false } as any,
      });
    }

    return savedImages;
  }

  async updateImage(imageId: number, postData: any): Promise<any> {
    const updatedImage = await this.prisma.images.update({
      where: {
        id: imageId,
      },
      data: {
        ...postData,
      },
    });
    return updatedImage;
  }

  async updateImagesByProjectId(
    projectId: number,
    updateFields: any,
  ): Promise<void> {
    await this.prisma.images.updateMany({
      where: { projectId },
      data: updateFields,
    });
    return;
  }

  // New helper methods for processing status tracking
  async markImagesQueued(imageIds: number[]): Promise<void> {
    await this.prisma.images.updateMany({
      where: { id: { in: imageIds } },
      data: { processingStatus: "queued" },
    });
    this.logger.log(
      `Marked ${imageIds.length} images as queued for processing`,
    );
  }

  async markImagesCompleted(
    imageIds: number[],
    isHealthy: boolean,
  ): Promise<void> {
    await this.prisma.images.updateMany({
      where: { id: { in: imageIds } },
      data: {
        isInspected: true,
        isHealthy,
        processingStatus: "completed",
      },
    });
    this.logger.log(
      `Marked ${imageIds.length} images as completed (healthy: ${isHealthy})`,
    );
  }

  async getImagesbyId(
    page: number,
    limit: number,
    projectId: number,
    isHealthy?: boolean,
    isInspected?: boolean,
    searchTerm?: string, // Added searchTerm parameter
    isRgb?: boolean,
  ): Promise<{ images: ImageDto[]; moreImages: boolean }> {
    const whereClause: any = { projectId, isDeleted: false };

    if (isHealthy !== undefined) {
      whereClause.isHealthy = String(isHealthy).toLowerCase() === "true";
    }

    if (isInspected !== undefined) {
      whereClause.isInspected = String(isInspected).toLowerCase() === "true";
    }

    // Add searchTerm condition specifically for imageName
    if (searchTerm) {
      whereClause.imageName = {
        contains: searchTerm.toUpperCase(),
      };
    }
    if (isRgb !== undefined) {
      whereClause.rgb = isRgb; // Filter based on the rgb field
    }

    const images = await this.prisma.images.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: +limit,
    });

    // Custom sorting by the last numeric part of the filename, prioritizing T over V
    images.sort((a, b) => {
      // Extract the numeric part and the suffix
      const extractNumberAndSuffix = (url: string) => {
        const match = url.match(/_(\d+)(_[TV])?\.JPG/);
        return match
          ? { number: parseInt(match[1], 10), suffix: match[2] }
          : { number: 0, suffix: "" };
      };

      const { number: numberA, suffix: suffixA } = extractNumberAndSuffix(
        a.image,
      );
      const { number: numberB, suffix: suffixB } = extractNumberAndSuffix(
        b.image,
      );

      // First, compare the numeric parts
      if (numberA !== numberB) {
        return numberA - numberB; // Sort by numeric part
      }

      // If numeric parts are the same, prioritize T over V
      if (suffixA === "_T" && suffixB === "_V") {
        return -1; // a should come before b
      } else if (suffixA === "_V" && suffixB === "_T") {
        return 1; // b should come before a
      }

      return 0; // They are equal in terms of sorting
    });

    let moreImages = true;
    if (images.length < limit) {
      moreImages = false;
    }

    const result = {
      images: images.map((image) => this.convertToImageDto(image)),
      moreImages,
    };

    return result;
  }

  async getPanelStatistics(projectId: number): Promise<any> {
    const panelStatistics = await this.prisma.panelStatistics.findMany({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: "desc", // or updatedAt: 'desc' if you want to sort by the updated timestamp
      },
    });

    const aggregatedData = panelStatistics.reduce(
      (acc, record) => {
        acc.totalImages += record.totalImages;
        acc.healthyPanels += record.healthyPanels;
        acc.unhealthyPanels += record.unhealthyPanels;
        acc.inspectedPanels += record.inspectedPanels;
        return acc;
      },
      {
        totalImages: 0,
        healthyPanels: 0,
        unhealthyPanels: 0,
        inspectedPanels: 0,
      },
    );

    // Updated processing calculation: count images that are not yet processed
    // This includes both null (uploaded but not sent for processing) and "queued" (sent but not completed)
    const processing = await this.prisma.images.count({
      where: {
        projectId,
        isDeleted: false,
        OR: [
          { processingStatus: null }, // Uploaded but not sent for processing
          { processingStatus: "queued" }, // Sent for processing but not completed
        ],
      },
    });

    return {
      projectId,
      ...aggregatedData,
      processing,
    };
  }

  async PanelAuditLog(projectId: number, totalPanels: number): Promise<any> {
    const panelInfo = await this.prisma.panelAuditLog.create({
      data: {
        totalImages: totalPanels,
        action: "Upload",
        project: {
          connect: {
            id: projectId,
          },
        },
      },
    });

    return panelInfo;
  }
  async PanelStatistics(
    projectId: number,
    totalPanels: number,
    unhealthyPanels: number,
    isFixed: boolean = false,
  ): Promise<any> {
    const project_id = projectId;
    const previousStatistics = await this.prisma.panelStatistics.findFirst({
      where: { projectId: project_id },
      orderBy: { createdAt: "desc" },
    });
    let inspectedPanels = previousStatistics
      ? previousStatistics.inspectedPanels
      : 0;
    let healthyPanels = previousStatistics
      ? previousStatistics.healthyPanels
      : 0;

    let newTotalImages = previousStatistics
      ? previousStatistics.totalImages
      : 0;
    newTotalImages += totalPanels;

    if (isFixed) {
      unhealthyPanels = previousStatistics.unhealthyPanels - 1;
      healthyPanels += 1;
    } else if (unhealthyPanels > 0) {
      // When processing unhealthy images, we know exactly how many were processed
      // Don't assume anything about unprocessed images

      // Get actual counts from database for this specific processing batch
      const actualHealthyCount = await this.prisma.images.count({
        where: {
          projectId,
          isInspected: true,
          isHealthy: true,
          isDeleted: false,
        },
      });

      const actualUnhealthyCount = await this.prisma.images.count({
        where: {
          projectId,
          isInspected: true,
          isHealthy: false,
          isDeleted: false,
        },
      });

      const actualInspectedCount = await this.prisma.images.count({
        where: {
          projectId,
          isInspected: true,
          isDeleted: false,
        },
      });

      // Use actual counts from database instead of assumptions
      healthyPanels = actualHealthyCount;
      inspectedPanels = actualInspectedCount;
      unhealthyPanels = actualUnhealthyCount;
    }

    const panelInfo = await this.prisma.panelStatistics.upsert({
      where: {
        id: previousStatistics ? previousStatistics.id : -1,
      },
      update: {
        totalImages: newTotalImages,
        unhealthyPanels: unhealthyPanels,
        healthyPanels: healthyPanels,
        inspectedPanels: inspectedPanels,
      },
      create: {
        totalImages: newTotalImages,
        unhealthyPanels: unhealthyPanels,
        healthyPanels: healthyPanels,
        inspectedPanels: inspectedPanels,
        project: {
          connect: {
            id: project_id,
          },
        },
      },
    });

    return panelInfo;
  }
  async getUnhealthyImagesByProjectId(projectId: number) {
    const images = await this.prisma.images.findMany({
      where: {
        projectId: +projectId,
        isHealthy: false,
      },
      orderBy: {
        imageName: "asc", // order images from lowest to highest based on name
      },
    });
    // Assuming the image URL is stored in the `image` property and can be parsed to get bucketName and fileName
    return images.map((image) => {
      const url = new URL(image.image);
      const fileName = url.pathname.substring(1);
      const format = fileName.split(".").pop().toLowerCase(); // Get the image format
      return { ...image, fileName, format };
    });
  }

  async getImagesByIds(ids: number[]) {
    if (!ids || ids.length === 0) return [];
    const images = await this.prisma.images.findMany({
      where: {
        id: { in: ids },
        isDeleted: false,
      },
      orderBy: {
        imageName: "asc",
      },
    });
    return images.map((image) => {
      try {
        const url = new URL(image.image);
        const fileName = url.pathname.substring(1);
        const format = fileName.split(".").pop().toLowerCase();
        return { ...image, fileName, format };
      } catch {
        return { ...image, fileName: image.imageName ?? "", format: "jpg" };
      }
    });
  }
  async searchImagesByName(
    projectId: number,
    searchTerm: string,
    isHealthy?: boolean,
    isInspected?: boolean,
  ): Promise<ImageDto[]> {
    const whereClause: any = {
      projectId,
      imageName: {
        contains: searchTerm.toUpperCase(),
      },
    };

    if (isHealthy !== undefined) {
      whereClause.isHealthy = isHealthy;
    }

    if (isInspected !== undefined) {
      whereClause.isInspected = isInspected;
    }

    const images = await this.prisma.images.findMany({
      where: whereClause,
    });

    return images.map((image) => this.convertToImageDto(image));
  }

  async DeleteImages(ids: number[]): Promise<{ message: string }> {
    const deletedImages = [];

    // Get the project IDs for all images to be deleted
    const projectIds = new Set<number>(); // Use a Set to avoid duplicates

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      // const isRgb = rgbFlags[i]; // No longer needed since we update statistics for all

      // Find the image record by id
      const image = await this.prisma.images.findUnique({
        where: { id }, // Ensure this matches the correct field in your database
        select: { projectId: true },
      });

      if (!image) {
        throw new NotFoundException(`Image not found with id: ${id}`);
      }

      // Add the project ID to the set
      projectIds.add(image.projectId);

      // Update the isDeleted field to true
      const deletedImage = await this.prisma.images.update({
        where: { id }, // Ensure this matches the correct field in your database
        data: { isDeleted: true },
      });

      deletedImages.push(deletedImage);

      // Update the statistics for both RGB and non-RGB images
      await this.PanelStatistics(image.projectId, -1, 0); // Decrement total images for all deleted images
    }

    return { message: "Images deleted successfully." };
  }

  async updatePanelInformation(
    imageId: number,
    panelInformation: PanelInfoDto[],
  ): Promise<void> {
    try {
      // Get the image to check its RGB status and project ID
      const image = await this.prisma.images.findUnique({
        where: { id: imageId },
        select: { rgb: true, projectId: true },
      });

      if (!image) {
        throw new HttpException(
          { message: `Image with ID ${imageId} not found` },
          HttpStatus.NOT_FOUND,
        );
      }

      // Get the current running job for this project to determine job type
      const runningJob = await this.prisma.drospectInspection.findFirst({
        where: {
          projectId: image.projectId,
          status: "running",
        },
        select: { model: true },
      });

      // Determine if we should update status based on job type and image type
      let shouldUpdateStatus = true;

      if (runningJob) {
        const isClassificationJob = runningJob.model === "CLASSIFICATION";
        const isRgbImage = image.rgb;

        // CLASSIFICATION job: only update RGB images
        // Other jobs (HIGH/LOW/ROOF): only update thermal images
        if (isClassificationJob && !isRgbImage) {
          // CLASSIFICATION job with thermal image -> don't update status
          shouldUpdateStatus = false;
        } else if (!isClassificationJob && isRgbImage) {
          // Regular inspection job with RGB image -> don't update status
          shouldUpdateStatus = false;
        }
      }

      // Prepare update data
      const updateData: any = {
        panelInformation: JSON.stringify(panelInformation),
      };

      // Only set isInspected and isHealthy if it should be updated based on job type and image type
      if (shouldUpdateStatus) {
        updateData.isInspected = true;
        updateData.isHealthy = panelInformation.length === 0; // If no unhealthy panels, mark as healthy
        updateData.processingStatus = "completed"; // Mark as completed when panel information is processed
      }

      await this.prisma.images.update({
        where: { id: imageId },
        data: updateData,
      });

      this.logger.log(`Updated panel information for image ${imageId}`);
    } catch (error) {
      this.logger.error(
        `Error updating panel information for image ${imageId}: ${error.message}`,
      );
      throw new HttpException(
        { message: "Failed to update panel information" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getImageWithPanelInformation(imageId: number): Promise<ImageDto> {
    try {
      const image = await this.prisma.images.findUnique({
        where: { id: imageId },
      });

      if (!image) {
        throw new HttpException(
          { message: `Image with ID ${imageId} not found` },
          HttpStatus.NOT_FOUND,
        );
      }

      return this.convertToImageDto(image);
    } catch (error) {
      this.logger.error(
        `Error getting image with panel information: ${error.message}`,
      );
      throw new HttpException(
        { message: "Failed to get image information" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getImagesByProjectId(
    projectId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ images: ImageDto[]; moreImages: boolean }> {
    const skip = (page - 1) * limit;
    const images = await this.prisma.images.findMany({
      where: {
        projectId,
        isDeleted: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit + 1,
    });

    const hasMore = images.length > limit;
    const imagesToReturn = images.slice(0, limit);

    return {
      images: imagesToReturn.map((image) => this.convertToImageDto(image)),
      moreImages: hasMore,
    };
  }

  async getUnhealthyImages(
    projectId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<ImageDto[]> {
    const skip = (page - 1) * limit;
    const images = await this.prisma.images.findMany({
      where: {
        projectId,
        isHealthy: false,
        isDeleted: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    return images.map((image) => this.convertToImageDto(image));
  }

  /**
   * Generic method to get images by project ID with a single filter condition
   */
  private async getImagesByProjectIdWithFilter(
    projectId: number,
    filterField: string,
    filterValue: boolean,
    page: number = 1,
    limit: number = 10,
  ): Promise<ImageDto[]> {
    const skip = (page - 1) * limit;
    const whereClause: any = {
      projectId,
      isDeleted: false,
    };
    whereClause[filterField] = filterValue;

    const images = await this.prisma.images.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    return images.map((image) => this.convertToImageDto(image));
  }

  async getImagesByProjectIdAndStatus(
    projectId: number,
    isHealthy: boolean,
    page: number = 1,
    limit: number = 10,
  ): Promise<ImageDto[]> {
    return this.getImagesByProjectIdWithFilter(
      projectId,
      "isHealthy",
      isHealthy,
      page,
      limit,
    );
  }

  async getImagesByProjectIdAndInspectionStatus(
    projectId: number,
    isInspected: boolean,
    page: number = 1,
    limit: number = 10,
  ): Promise<ImageDto[]> {
    return this.getImagesByProjectIdWithFilter(
      projectId,
      "isInspected",
      isInspected,
      page,
      limit,
    );
  }

  async getImagesByProjectIdAndFixStatus(
    projectId: number,
    isFixed: boolean,
    page: number = 1,
    limit: number = 10,
  ): Promise<ImageDto[]> {
    return this.getImagesByProjectIdWithFilter(
      projectId,
      "isFixed",
      isFixed,
      page,
      limit,
    );
  }

  async getImagesByProjectIdAndRGB(
    projectId: number,
    rgb: boolean,
    page: number = 1,
    limit: number = 10,
  ): Promise<ImageDto[]> {
    return this.getImagesByProjectIdWithFilter(
      projectId,
      "rgb",
      rgb,
      page,
      limit,
    );
  }

  async getImagesByProjectIdAndDateRange(
    projectId: number,
    startDate: Date,
    endDate: Date,
    page: number = 1,
    limit: number = 10,
  ): Promise<ImageDto[]> {
    const skip = (page - 1) * limit;
    const images = await this.prisma.images.findMany({
      where: {
        projectId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        isDeleted: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    return images.map((image) => this.convertToImageDto(image));
  }

  async getImagesByProjectIdAndLocation(
    projectId: number,
    latitude: number,
    longitude: number,
    radius: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<ImageDto[]> {
    const skip = (page - 1) * limit;
    const images = await this.prisma.images.findMany({
      where: {
        projectId,
        latitude: {
          gte: latitude - radius,
          lte: latitude + radius,
        },
        longitude: {
          gte: longitude - radius,
          lte: longitude + radius,
        },
        isDeleted: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    return images.map((image) => this.convertToImageDto(image));
  }

  async getImagesByProjectIdAndAltitude(
    projectId: number,
    minAltitude: number,
    maxAltitude: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<ImageDto[]> {
    const skip = (page - 1) * limit;
    const images = await this.prisma.images.findMany({
      where: {
        projectId,
        altitude: {
          gte: minAltitude.toString(),
          lte: maxAltitude.toString(),
        },
        isDeleted: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    return images.map((image) => this.convertToImageDto(image));
  }

  async getImagesByProjectIdAndPanelCount(
    projectId: number,
    minPanels: number,
    maxPanels: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<ImageDto[]> {
    const skip = (page - 1) * limit;
    const images = await this.prisma.images.findMany({
      where: {
        projectId,
        isDeleted: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    // Filter images based on panel count
    const filteredImages = images.filter((image) => {
      if (!image.panelInformation) return false;
      try {
        const panelInfo = JSON.parse(image.panelInformation as string);
        const panelCount = Array.isArray(panelInfo) ? panelInfo.length : 0;
        return panelCount >= minPanels && panelCount <= maxPanels;
      } catch {
        return false;
      }
    });

    return filteredImages.map((image) => this.convertToImageDto(image));
  }

  // Delegate duplicate filtering to the dedicated service
  async filterDuplicateImages(filterDto: FilterDuplicatesDto): Promise<{
    filteredImages: any[];
    duplicateGroups: DuplicateGroup[];
    stats: {
      totalImages: number;
      duplicatesRemoved: number;
      groupsFound: number;
    };
  }> {
    return this.duplicateFilterService.filterDuplicateImages(filterDto);
  }

  async applyDuplicateFilter(filterDto: FilterDuplicatesDto): Promise<{
    message: string;
    stats: {
      totalImages: number;
      duplicatesMarkedDeleted: number;
      groupsProcessed: number;
    };
  }> {
    return this.duplicateFilterService.applyDuplicateFilter(filterDto);
  }
}
