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

export class ParallelImageProcessor {
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
   * Process a single image file with parallel metadata extraction and upload
   */
  async processImageFileParallel(
    file: Multer.File,
    projectId: number,
    bucket: Bucket,
    folderName: string,
  ): Promise<ImageMetadata> {
    try {
      // Start metadata extraction and upload in parallel
      const [metadataResult, uploadResult] = await Promise.all([
        this.metadataExtractor.extractImageMetadata(file.buffer, {
          filename: file.originalname,
        }),
        this.gcsUploader.uploadToGCS(
          file.buffer,
          file.originalname,
          bucket,
          folderName,
        ),
      ]);

      const imageMetadata: ImageMetadata = {
        latitude: metadataResult.gps.latitude,
        longitude: metadataResult.gps.longitude,
        isRGB: metadataResult.isRGB,
        filename: file.originalname,
        publicUrl: uploadResult,
      };

      // Minimal per-file log can be re-enabled if needed
      return imageMetadata;
    } catch (error) {
      this.logger.error(`Error processing image ${file.originalname}:`, error);
      throw error;
    }
  }

  /**
   * Process multiple image files with parallel processing and better error handling
   */
  async processMultipleImagesParallel(
    files: Multer.File[],
    projectId: number,
    bucket: Bucket,
    folderName: string,
    _options?: UploadOptions,
  ): Promise<{
    processedImages: ImageMetadata[];
    failedImages: Array<{ filename: string; error: string }>;
    processingTime: number;
  }> {
    const startTime = Date.now();

    // Validate files first
    const validation = this.validator.validateFiles(files);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    // Process all files in parallel with Promise.allSettled for better error handling
    const processingPromises = files.map(async (file) => {
      try {
        const imageMetadata = await this.processImageFileParallel(
          file,
          projectId,
          bucket,
          folderName,
        );
        return {
          success: true,
          data: imageMetadata,
          filename: file.originalname,
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          filename: file.originalname,
        };
      }
    });

    // Wait for all processing to complete
    const results = await Promise.allSettled(processingPromises);

    const processedImages: ImageMetadata[] = [];
    const failedImages: Array<{ filename: string; error: string }> = [];

    // Process results
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        const fileResult = result.value;
        if (fileResult.success) {
          processedImages.push(fileResult.data);
        } else {
          failedImages.push({
            filename: fileResult.filename,
            error: fileResult.error,
          });
          this.logger.error(
            `Failed to process ${fileResult.filename}: ${fileResult.error}`,
          );
        }
      } else {
        // Handle rejected promises
        failedImages.push({
          filename: files[index]?.originalname || "unknown",
          error: result.reason?.message || "Unknown error",
        });
        this.logger.error(
          `Promise rejected for file ${files[index]?.originalname}:`,
          result.reason,
        );
      }
    });

    const processingTime = Date.now() - startTime;
    this.logger.info(
      `Processed ${files.length} files in ${processingTime}ms. Success: ${processedImages.length}, Failed: ${failedImages.length}`,
    );

    return {
      processedImages,
      failedImages,
      processingTime,
    };
  }

  /**
   * Extract drone metadata from files (optimized for parallel processing)
   */
  async extractDroneMetadataParallel(
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
   * Batch process images with configurable batch size for memory optimization
   */
  async processImagesInBatches(
    files: Multer.File[],
    projectId: number,
    bucket: Bucket,
    folderName: string,
    options?: UploadOptions,
  ): Promise<{
    processedImages: ImageMetadata[];
    failedImages: Array<{ filename: string; error: string }>;
    totalProcessingTime: number;
    batchResults: Array<{
      batchNumber: number;
      successCount: number;
      failureCount: number;
      processingTime: number;
    }>;
  }> {
    const batchSize = options?.batchSize || 10;
    const totalStartTime = Date.now();
    const allProcessedImages: ImageMetadata[] = [];
    const allFailedImages: Array<{ filename: string; error: string }> = [];
    const batchResults: Array<{
      batchNumber: number;
      successCount: number;
      failureCount: number;
      processingTime: number;
    }> = [];

    // Process files in batches
    for (let i = 0; i < files.length; i += batchSize) {
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batchStartTime = Date.now();
      const batch = files.slice(i, i + batchSize);

      this.logger.info(
        `Processing batch ${batchNumber} with ${batch.length} files`,
      );

      const batchResult = await this.processMultipleImagesParallel(
        batch,
        projectId,
        bucket,
        folderName,
        options,
      );

      const batchProcessingTime = Date.now() - batchStartTime;
      batchResults.push({
        batchNumber,
        successCount: batchResult.processedImages.length,
        failureCount: batchResult.failedImages.length,
        processingTime: batchProcessingTime,
      });

      allProcessedImages.push(...batchResult.processedImages);
      allFailedImages.push(...batchResult.failedImages);

      this.logger.info(
        `Batch ${batchNumber} completed in ${batchProcessingTime}ms. Success: ${batchResult.processedImages.length}, Failed: ${batchResult.failedImages.length}`,
      );
    }

    const totalProcessingTime = Date.now() - totalStartTime;
    this.logger.info(
      `All batches completed in ${totalProcessingTime}ms. Total Success: ${allProcessedImages.length}, Total Failed: ${allFailedImages.length}`,
    );

    return {
      processedImages: allProcessedImages,
      failedImages: allFailedImages,
      totalProcessingTime,
      batchResults,
    };
  }
}
