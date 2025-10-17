import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import {
  FilterDuplicatesDto,
  DuplicateGroup,
} from "../dto/duplicate-filter.dto";
import { ImageDto, PanelInfoDto } from "../image.model";

@Injectable()
export class DuplicateFilterService {
  private readonly logger = new Logger(DuplicateFilterService.name);

  constructor(private prisma: PrismaService) {}

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
        this.logger.warn(
          `Failed to parse panel information for image ${image.id}:`,
          e.message,
        );
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

  // Calculate distance between two GPS coordinates using Haversine formula
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Convert to meters
  }

  // Extract timestamp from image filename or metadata
  private extractTimestamp(imageName: string): Date {
    // Try to extract timestamp from DJI filename pattern: DJI_YYYYMMDDHHMMSS_XXXX_T.JPG
    const djiMatch = imageName.match(/DJI_(\d{8})(\d{6})_/);
    if (djiMatch) {
      const dateStr = djiMatch[1]; // YYYYMMDD
      const timeStr = djiMatch[2]; // HHMMSS

      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
      const day = parseInt(dateStr.substring(6, 8));
      const hour = parseInt(timeStr.substring(0, 2));
      const minute = parseInt(timeStr.substring(2, 4));
      const second = parseInt(timeStr.substring(4, 6));

      const timestamp = new Date(year, month, day, hour, minute, second);

      return timestamp;
    }

    // Fallback: Try to extract timestamp from generic pattern YYYYMMDD_HHMMSS
    const timestampMatch = imageName.match(/(\d{8}_\d{6})/);
    if (timestampMatch) {
      const timestampStr = timestampMatch[1];
      const year = parseInt(timestampStr.substring(0, 4));
      const month = parseInt(timestampStr.substring(4, 6)) - 1;
      const day = parseInt(timestampStr.substring(6, 8));
      const hour = parseInt(timestampStr.substring(9, 11));
      const minute = parseInt(timestampStr.substring(11, 13));
      const second = parseInt(timestampStr.substring(13, 15));
      const timestamp = new Date(year, month, day, hour, minute, second);
      return timestamp;
    }

    // Final fallback to creation date if available
    return new Date();
  }

  // Calculate an image quality score based on multiple factors
  // Higher score = better representative image
  private async calculateImageQualityScore(image: any): Promise<number> {
    let score = 0;

    try {
      // 1. Basic metadata scoring
      if (image.isInspected) score += 20; // Prioritize analyzed images
      if (!image.isHealthy) score += 15; // Prioritize defective panels
      if (!image.rgb) score += 10; // Prefer thermal images for defect detection

      // 2. Try to fetch image to analyze basic properties
      try {
        // eslint-disable-next-line no-undef
        const response = await fetch(image.image, { method: "HEAD" });
        if (response.ok) {
          // File size often correlates with image quality/detail
          const contentLength = response.headers.get("content-length");
          if (contentLength) {
            const fileSizeKB = parseInt(contentLength) / 1024;
            // Score based on file size (bigger often means more detail, but cap to avoid huge files)
            if (fileSizeKB > 100 && fileSizeKB < 5000) {
              score += Math.min(15, fileSizeKB / 200); // Max 15 points for size
            }
          }
        }
      } catch {
        // If fetch fails, continue with other scoring
      }

      // 3. Filename-based heuristics (assuming drone naming patterns)
      const filename = image.imageName?.toUpperCase() || "";

      // Prefer images with certain patterns that might indicate center/quality shots
      if (filename.includes("_T")) score += 8; // Thermal images often better for defects
      if (filename.includes("CENTER") || filename.includes("MID")) score += 10;
      if (filename.includes("CLOSE") || filename.includes("DETAIL")) score += 5;

      // 4. Panel information scoring
      if (image.panelInformation && Array.isArray(image.panelInformation)) {
        const panelCount = image.panelInformation.length;
        // More panels detected might mean better visibility
        score += Math.min(20, panelCount * 3); // Max 20 points for panels

        // Analyze temperature data quality
        const avgTemps = image.panelInformation
          .map((panel) => panel.AvgTemp)
          .filter((temp) => !isNaN(temp));

        if (avgTemps.length > 0) {
          const tempRange = Math.max(...avgTemps) - Math.min(...avgTemps);
          // Good temperature range might indicate better thermal data
          if (tempRange > 5) score += 10; // Good thermal contrast
        }
      }

      // 5. Timestamp scoring (prefer images from middle of sequence, not first/last)
      const timestamp = this.extractTimestamp(image.imageName);
      if (timestamp) {
        // This will be refined when comparing within a group
        score += 5; // Base score for having timestamp
      }
    } catch (error) {
      this.logger.error(error);
    }

    return score;
  }

  // Enhanced group representative selection using image quality analysis
  private async selectBestRepresentativeImage(
    group: DuplicateGroup,
  ): Promise<any> {
    // Calculate quality scores for all images in the group
    const imageScores = await Promise.all(
      group.duplicates.map(async (image) => ({
        image,
        score: await this.calculateImageQualityScore(image),
      })),
    );

    // Additional group-specific scoring
    for (const item of imageScores) {
      const image = item.image;

      // Distance from group center (closer to center = better positioned)
      const distanceFromCenter = this.calculateDistance(
        image.latitude,
        image.longitude,
        group.groupCenter.latitude,
        group.groupCenter.longitude,
      );

      // Closer to group center gets bonus points
      const centerBonus = Math.max(0, 10 - distanceFromCenter); // Max 10 bonus points
      item.score += centerBonus;

      // Temporal position in sequence (prefer middle images over first/last)
      const timestamps = group.duplicates.map((img) =>
        this.extractTimestamp(img.imageName),
      );
      const sortedTimestamps = [...timestamps].sort(
        (a, b) => a.getTime() - b.getTime(),
      );
      const imageTimestamp = this.extractTimestamp(image.imageName);
      const timeIndex = sortedTimestamps.findIndex(
        (t) => t.getTime() === imageTimestamp.getTime(),
      );

      if (group.duplicates.length >= 3) {
        // Prefer middle images in sequences of 3+
        const middleBonus =
          group.duplicates.length -
          Math.abs(timeIndex - (group.duplicates.length - 1) / 2);
        item.score += middleBonus * 2;
      }
    }

    // Sort by score (highest first) and select the best one
    imageScores.sort((a, b) => b.score - a.score);

    return imageScores[0].image;
  }

  // Group images by GPS proximity and time
  private async groupDuplicateImages(
    images: any[],
    radiusMeters: number = 15, // Increased from 0 to 15 meters for better drone GPS tolerance
    timeWindowSeconds: number = 30, // Increased from 0 to 30 seconds for better coverage
  ): Promise<DuplicateGroup[]> {
    const groups: DuplicateGroup[] = [];
    const processed = new Set<number>();

    // Sort images by timestamp to process them in chronological order
    const sortedImages = [...images].sort((a, b) => {
      const timeA = this.extractTimestamp(a.imageName);
      const timeB = this.extractTimestamp(b.imageName);
      return timeA.getTime() - timeB.getTime();
    });

    for (const image of sortedImages) {
      if (processed.has(image.id) || !image.latitude || !image.longitude) {
        continue;
      }

      const group: DuplicateGroup = {
        representativeImage: image,
        duplicates: [image],
        groupCenter: { latitude: image.latitude, longitude: image.longitude },
        groupSize: 1,
      };

      const imageTimestamp = this.extractTimestamp(image.imageName);
      processed.add(image.id);

      // Find nearby images within radius and time window
      for (const otherImage of sortedImages) {
        if (
          processed.has(otherImage.id) ||
          !otherImage.latitude ||
          !otherImage.longitude ||
          otherImage.id === image.id
        ) {
          continue;
        }

        const distance = this.calculateDistance(
          image.latitude,
          image.longitude,
          otherImage.latitude,
          otherImage.longitude,
        );

        const otherTimestamp = this.extractTimestamp(otherImage.imageName);
        const timeDiff =
          Math.abs(imageTimestamp.getTime() - otherTimestamp.getTime()) / 1000;

        // Check both spatial and temporal proximity with AND condition
        const isCloseInSpace = distance <= radiusMeters;
        const isCloseInTime = timeDiff <= timeWindowSeconds;

        // Group if BOTH close in space AND close in time (strict AND condition)
        if (isCloseInSpace && isCloseInTime) {
          group.duplicates.push(otherImage);
          processed.add(otherImage.id);
          group.groupSize++;
        }
      }

      // Add groups with 2 or more images (less restrictive)
      if (group.duplicates.length >= 2) {
        // Calculate group center first (needed for distance-based scoring)
        const avgLat =
          group.duplicates.reduce((sum, img) => sum + img.latitude, 0) /
          group.duplicates.length;
        const avgLon =
          group.duplicates.reduce((sum, img) => sum + img.longitude, 0) /
          group.duplicates.length;
        group.groupCenter = { latitude: avgLat, longitude: avgLon };

        // Use intelligent selection based on image quality analysis
        group.representativeImage = await this.selectBestRepresentativeImage(
          group,
        );

        groups.push(group);
      }
    }

    return groups;
  }

  // Filter duplicate images and return filtered list
  async filterDuplicateImages(filterDto: FilterDuplicatesDto): Promise<{
    filteredImages: any[];
    duplicateGroups: DuplicateGroup[];
    stats: {
      totalImages: number;
      duplicatesRemoved: number;
      groupsFound: number;
    };
  }> {
    const {
      projectId,
      radiusMeters = 0,
      timeWindowSeconds = 0,
      onlyUnhealthy = true,
    } = filterDto;

    // Get images to analyze
    const whereClause: any = {
      projectId,
      isDeleted: false,
      latitude: { not: null },
      longitude: { not: null },
    };

    if (onlyUnhealthy) {
      // Only include inspected unhealthy images for duplicate filtering
      whereClause.isHealthy = false;
      whereClause.isInspected = true;
    }

    const images = await this.prisma.images.findMany({
      where: whereClause,
      orderBy: { imageName: "asc" },
    });

    const totalImages = images.length;

    if (totalImages === 0) {
      return {
        filteredImages: [],
        duplicateGroups: [],
        stats: { totalImages: 0, duplicatesRemoved: 0, groupsFound: 0 },
      };
    }

    // Group duplicate images
    const duplicateGroups = await this.groupDuplicateImages(
      images,
      radiusMeters,
      timeWindowSeconds,
    );

    // Create filtered list (keep representative images, remove duplicates)
    const singleImages = images.filter(
      (img) =>
        !duplicateGroups.some((group) =>
          group.duplicates.some((dup) => dup.id === img.id),
        ),
    );

    const rawFilteredImages = [
      ...singleImages,
      ...duplicateGroups.map((group) => group.representativeImage),
    ].sort((a, b) => a.imageName.localeCompare(b.imageName));

    // Process the filtered images through convertToImageDto to ensure proper structure
    const filteredImages = rawFilteredImages.map((image) =>
      this.convertToImageDto(image),
    );

    const duplicatesRemoved = totalImages - filteredImages.length;

    return {
      filteredImages,
      duplicateGroups,
      stats: {
        totalImages,
        duplicatesRemoved,
        groupsFound: duplicateGroups.length,
      },
    };
  }

  // Apply duplicate filtering by marking duplicates as deleted
  async applyDuplicateFilter(filterDto: FilterDuplicatesDto): Promise<{
    message: string;
    stats: {
      totalImages: number;
      duplicatesMarkedDeleted: number;
      groupsProcessed: number;
    };
  }> {
    const result = await this.filterDuplicateImages(filterDto);

    if (result.duplicateGroups.length === 0) {
      return {
        message: "No duplicate groups found",
        stats: {
          totalImages: result.stats.totalImages,
          duplicatesMarkedDeleted: 0,
          groupsProcessed: 0,
        },
      };
    }

    // Mark duplicates as deleted (keeping representative images)
    const duplicateIds: number[] = [];

    for (const group of result.duplicateGroups) {
      const duplicatesToDelete = group.duplicates.filter(
        (img) => img.id !== group.representativeImage.id,
      );
      duplicateIds.push(...duplicatesToDelete.map((img) => img.id));
    }

    if (duplicateIds.length > 0) {
      await this.prisma.images.updateMany({
        where: { id: { in: duplicateIds } },
        data: { isDeleted: true },
      });
    }

    return {
      message: `Successfully filtered ${duplicateIds.length} duplicate images from ${result.duplicateGroups.length} groups`,
      stats: {
        totalImages: result.stats.totalImages,
        duplicatesMarkedDeleted: duplicateIds.length,
        groupsProcessed: result.duplicateGroups.length,
      },
    };
  }
}
