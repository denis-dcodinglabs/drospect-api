import { Multer } from "multer";
import { Bucket } from "@google-cloud/storage";
import { MetadataExtractor } from "./metadata-extractor";
import { GCSUploader } from "./gcs-uploader";
import { UploadValidator } from "./upload-validator";
import {
  ImageMetadata,
  DroneMetadata,
  UploadOptions,
} from "./upload-interfaces";
import { AppLogger } from "../../common/logger/logger.service";

export class ImageProcessor {
  private metadataExtractor: MetadataExtractor;
  private gcsUploader: GCSUploader;
  private validator: UploadValidator;
  private logger: AppLogger;

  constructor() {
    this.metadataExtractor = new MetadataExtractor();
    this.gcsUploader = new GCSUploader();
    this.validator = new UploadValidator();
    this.logger = new AppLogger();
  }

  /**
   * Process a single image file
   */
  async processImageFile(
    file: Multer.File,
    projectId: number,
    bucket: Bucket,
    folderName: string,
  ): Promise<ImageMetadata> {
    try {
      // Extract metadata
      const metadataResult = await this.metadataExtractor.extractImageMetadata(
        file.buffer,
        { filename: file.originalname },
      );

      // Upload to GCS
      const publicUrl = await this.gcsUploader.uploadToGCS(
        file.buffer,
        file.originalname,
        bucket,
        folderName,
      );

      const imageMetadata: ImageMetadata = {
        latitude: metadataResult.gps.latitude,
        longitude: metadataResult.gps.longitude,
        isRGB: metadataResult.isRGB,
        filename: file.originalname,
        publicUrl,
      };

      // Minimal per-file log can be re-enabled if needed
      return imageMetadata;
    } catch (error) {
      this.logger.error(`Error processing image ${file.originalname}:`, error);
      throw error;
    }
  }

  /**
   * Process multiple image files
   */
  async processMultipleImages(
    files: Multer.File[],
    projectId: number,
    bucket: Bucket,
    folderName: string,
    _options?: UploadOptions,
  ): Promise<{
    processedImages: ImageMetadata[];
    failedImages: Array<{ filename: string; error: string }>;
  }> {
    const processedImages: ImageMetadata[] = [];
    const failedImages: Array<{ filename: string; error: string }> = [];

    // Validate files first
    const validation = this.validator.validateFiles(files);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    // Process each file
    for (const file of files) {
      try {
        const imageMetadata = await this.processImageFile(
          file,
          projectId,
          bucket,
          folderName,
        );
        processedImages.push(imageMetadata);
      } catch (error) {
        failedImages.push({
          filename: file.originalname,
          error: error.message,
        });
        this.logger.error(`Failed to process ${file.originalname}:`, error);
      }
    }

    return {
      processedImages,
      failedImages,
    };
  }

  /**
   * Extract drone metadata from files
   */
  async extractDroneMetadata(
    files: Multer.File[],
    drone: boolean,
  ): Promise<DroneMetadata | null> {
    if (drone || !files || files.length === 0) {
      return null;
    }

    try {
      // Use the first file to extract drone metadata
      const droneMetadata = await this.metadataExtractor.extractDroneMetadata(
        files[0].buffer,
      );
      return droneMetadata;
    } catch (error) {
      this.logger.error("Error extracting drone metadata:", error);
      return null;
    }
  }

  /**
   * Process project coordinates update
   */
  async processProjectCoordinates(
    project: any,
    latitudes: number[],
    longitudes: number[],
  ): Promise<void> {
    try {
      // Find first valid coordinates
      for (let i = 0; i < Math.max(latitudes.length, longitudes.length); i++) {
        if (latitudes[i] !== null && longitudes[i] !== null) {
          // This would be called by the main service to update project coordinates
          this.logger.debug(
            `Found valid coordinates: ${latitudes[i]}, ${longitudes[i]}`,
          );
          break;
        }
      }
    } catch (error) {
      this.logger.error("Error processing project coordinates:", error);
      throw error;
    }
  }
}
