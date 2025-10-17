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

export class MemoryOptimizedProcessor {
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
   * Process files with memory optimization for resource-constrained environments
   */
  async processImagesMemoryOptimized(
    files: Multer.File[],
    projectId: number,
    bucket: Bucket,
    folderName: string,
    _options?: UploadOptions,
  ): Promise<{
    processedImages: ImageMetadata[];
    failedImages: Array<{ filename: string; error: string }>;
    processingTime: number;
    memoryUsage: string;
  }> {
    const startTime = Date.now();
    const initialMemory = process.memoryUsage();

    // Validate files first
    const validation = this.validator.validateFiles(files);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    const processedImages: ImageMetadata[] = [];
    const failedImages: Array<{ filename: string; error: string }> = [];

    // Process files sequentially to reduce memory pressure
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        this.logger.debug(
          `Processing file ${i + 1}/${files.length}: ${file.originalname}`,
        );

        // Process one file at a time to minimize memory usage
        const imageMetadata = await this.processSingleFileOptimized(
          file,
          projectId,
          bucket,
          folderName,
        );

        processedImages.push(imageMetadata);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Log memory usage every 5 files
        if ((i + 1) % 5 === 0) {
          const currentMemory = process.memoryUsage();
          this.logger.info(
            `Memory usage after ${i + 1} files: ${Math.round(
              currentMemory.heapUsed / 1024 / 1024,
            )}MB`,
          );
        }
      } catch (error) {
        failedImages.push({
          filename: file.originalname,
          error: error.message,
        });
        this.logger.error(`Failed to process ${file.originalname}:`, error);
      }
    }

    const processingTime = Date.now() - startTime;
    const finalMemory = process.memoryUsage();
    const memoryUsage = `${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`;

    this.logger.info(
      `Memory-optimized processing completed in ${processingTime}ms. Success: ${processedImages.length}, Failed: ${failedImages.length}, Memory: ${memoryUsage}`,
    );

    return {
      processedImages,
      failedImages,
      processingTime,
      memoryUsage,
    };
  }

  /**
   * Process a single file with memory optimization
   */
  private async processSingleFileOptimized(
    file: Multer.File,
    projectId: number,
    bucket: Bucket,
    folderName: string,
  ): Promise<ImageMetadata> {
    try {
      // Extract metadata first (CPU intensive)
      const metadataResult = await this.metadataExtractor.extractImageMetadata(
        file.buffer,
        { filename: file.originalname },
      );

      // Then upload (network intensive)
      const publicUrl = await this.gcsUploader.uploadToGCS(
        file.buffer,
        file.originalname,
        bucket,
        folderName,
      );

      // Clear the buffer to free memory
      (file as any).buffer = null;

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
   * Extract drone metadata (optimized for memory)
   */
  async extractDroneMetadataOptimized(
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
}
