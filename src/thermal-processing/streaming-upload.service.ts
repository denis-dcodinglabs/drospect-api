import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import axios, { AxiosInstance, AxiosResponse } from "axios";
import * as FormData from "form-data";
import { Readable, PassThrough } from "stream";
import { STREAMING_CONFIG } from "./streaming-config";

export interface StreamingUploadOptions {
  batchSize?: number;
  maxConcurrentBatches?: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
  zipurl?: string; // Optional zip URL for bulk upload
}

export interface UploadProgress {
  totalImages: number;
  uploadedImages: number;
  currentBatch: number;
  totalBatches: number;
  percentage: number;
}

@Injectable()
export class StreamingUploadService {
  private readonly logger = new Logger(StreamingUploadService.name);
  private readonly httpClient: AxiosInstance;
  private readonly nodeOdmBaseUrl: string;

  constructor() {
    this.nodeOdmBaseUrl =
      process.env.NODEODM_API_URL || "http://157.180.55.60:4000";

    this.httpClient = axios.create({
      baseURL: this.nodeOdmBaseUrl,
      timeout: 1800000, // 30 minutes timeout
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
  }

  /**
   * Stream upload images to NodeODM using multi-step process
   * @param images Array of image files or URLs
   * @param options NodeODM processing options
   * @param customUuid Optional UUID for the task
   * @param progressCallback Optional callback for upload progress
   * @returns Promise with task UUID
   */
  async streamUploadToNodeOdm(
    images: any[],
    options: any,
    customUuid?: string,
    progressCallback?: (progress: UploadProgress) => void,
  ): Promise<{ uuid: string }> {
    const uploadOptions: StreamingUploadOptions = {
      batchSize: STREAMING_CONFIG.batchSize,
      maxConcurrentBatches: STREAMING_CONFIG.maxConcurrentBatches,
      retryAttempts: STREAMING_CONFIG.retryAttempts,
      retryDelay: STREAMING_CONFIG.retryDelay,
      timeout: STREAMING_CONFIG.uploadTimeout,
    };

    this.logger.log(
      `Starting multi-step streaming upload for ${images.length} images with batch size ${uploadOptions.batchSize}`,
    );

    try {
      // Step 1: Initialize task
      const taskUuid = await this.initializeTask(options, customUuid);
      this.logger.log(`Task initialized with UUID: ${taskUuid}`);

      // Check if zipurl is provided for bulk upload
      if (options.zipurl) {
        this.logger.log(`Using zipurl for bulk upload: ${options.zipurl}`);
        await this.uploadZipUrl(taskUuid, options.zipurl);
      } else {
        // Step 2: Upload images in batches
        const totalBatches = Math.ceil(images.length / uploadOptions.batchSize);

        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
          const startIndex = batchIndex * uploadOptions.batchSize;
          const endIndex = Math.min(
            startIndex + uploadOptions.batchSize,
            images.length,
          );
          const batchImages = images.slice(startIndex, endIndex);

          this.logger.log(
            `Processing batch ${batchIndex + 1}/${totalBatches} with ${
              batchImages.length
            } images`,
          );

          // Upload batch with retry logic
          await this.uploadBatchWithRetry(
            taskUuid,
            batchImages,
            batchIndex,
            uploadOptions,
          );

          // Update progress
          const progress: UploadProgress = {
            totalImages: images.length,
            uploadedImages: endIndex,
            currentBatch: batchIndex + 1,
            totalBatches,
            percentage: Math.round((endIndex / images.length) * 100),
          };

          if (progressCallback) {
            progressCallback(progress);
          }

          // Memory monitoring
          if (STREAMING_CONFIG.enableMemoryMonitoring) {
            const memoryUsage = this.getMemoryUsage();
            const heapUsedMB = parseInt(memoryUsage.heapUsed);

            if (heapUsedMB > STREAMING_CONFIG.maxMemoryUsage) {
              this.logger.warn(
                `High memory usage detected: ${memoryUsage.heapUsed}. Consider reducing batch size.`,
              );
            }

            this.logger.log(
              `Memory usage after batch ${batchIndex + 1}: ${
                memoryUsage.heapUsed
              }`,
            );
          }

          this.logger.log(
            `Batch ${batchIndex + 1} completed. Progress: ${
              progress.percentage
            }%`,
          );
        }
      }

      // Step 3: Commit task and start processing
      await this.commitTask(taskUuid);
      this.logger.log(`Task ${taskUuid} committed and processing started`);

      return { uuid: taskUuid };
    } catch (error) {
      this.logger.error("Multi-step streaming upload failed:", error);
      throw new HttpException(
        `Multi-step streaming upload failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Step 1: Initialize task in NodeODM (without images)
   * @param options NodeODM options
   * @param customUuid Optional UUID
   * @returns Task UUID
   */
  private async initializeTask(
    options: any,
    customUuid?: string,
  ): Promise<string> {
    try {
      this.logger.log("Initializing NodeODM task...");

      const formData = new FormData();

      // Add options without images (excluding webhook as it's handled separately)
      const { webhook, ...processingOptions } = options;
      const optionsArray = Object.entries(processingOptions).map(
        ([name, value]) => ({
          name,
          value,
        }),
      );
      formData.append("options", JSON.stringify(optionsArray));

      // Add webhook if provided
      if (webhook) {
        formData.append("webhook", webhook);
      }
      const outputs = [
        "odm_orthophoto/odm_orthophoto.png",
        "odm_orthophoto/odm_orthophoto.tif",
      ];
      formData.append("outputs", JSON.stringify(outputs));

      const headers = {
        ...formData.getHeaders(),
      };

      if (customUuid) {
        headers["set-uuid"] = customUuid;
      }

      // Use the multi-step initialization endpoint
      const response: AxiosResponse<{ uuid: string }> =
        await this.httpClient.post("/task/new/init", formData, {
          headers,
          timeout: STREAMING_CONFIG.connectionTimeout,
        });

      this.logger.log(`Task initialized with UUID: ${response.data.uuid}`);
      return response.data.uuid;
    } catch (error) {
      this.logger.error("Failed to initialize task:", error);
      throw new Error(`Task initialization failed: ${error.message}`);
    }
  }

  /**
   * Upload zip URL for bulk processing
   * @param taskUuid Task UUID
   * @param zipurl URL to zip file containing images
   */
  private async uploadZipUrl(taskUuid: string, zipurl: string): Promise<void> {
    try {
      this.logger.log(`Uploading zip URL: ${zipurl} for task ${taskUuid}`);

      const formData = new FormData();
      formData.append("zipurl", zipurl);

      const headers = {
        ...formData.getHeaders(),
      };

      await this.httpClient.post(`/task/new/upload/${taskUuid}`, formData, {
        headers,
        timeout: STREAMING_CONFIG.uploadTimeout,
      });

      this.logger.log(`Zip URL uploaded successfully for task ${taskUuid}`);
    } catch (error) {
      this.logger.error(
        `Failed to upload zip URL for task ${taskUuid}:`,
        error,
      );
      throw new Error(`Zip URL upload failed: ${error.message}`);
    }
  }

  /**
   * Step 3: Commit task and start processing
   * @param taskUuid Task UUID
   */
  private async commitTask(taskUuid: string): Promise<void> {
    try {
      this.logger.log(`Committing task ${taskUuid} and starting processing...`);

      await this.httpClient.post(
        `/task/new/commit/${taskUuid}`,
        {},
        {
          timeout: STREAMING_CONFIG.connectionTimeout,
        },
      );

      this.logger.log(`Task ${taskUuid} committed successfully`);
    } catch (error) {
      this.logger.error(`Failed to commit task ${taskUuid}:`, error);
      throw new Error(`Task commit failed: ${error.message}`);
    }
  }

  /**
   * Upload a batch of images with retry logic
   * @param taskUuid Task UUID
   * @param batchImages Array of images in the batch
   * @param batchIndex Batch index
   * @param options Upload options
   */
  private async uploadBatchWithRetry(
    taskUuid: string,
    batchImages: any[],
    batchIndex: number,
    options: StreamingUploadOptions,
  ): Promise<void> {
    let lastError: Error;

    for (let attempt = 1; attempt <= options.retryAttempts; attempt++) {
      try {
        await this.uploadBatch(taskUuid, batchImages, batchIndex);
        return; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Batch ${batchIndex + 1} upload attempt ${attempt} failed:`,
          error.message,
        );

        if (attempt < options.retryAttempts) {
          this.logger.log(
            `Retrying batch ${batchIndex + 1} in ${options.retryDelay}ms...`,
          );
          await this.delay(options.retryDelay);
        }
      }
    }

    // All retry attempts failed
    throw new Error(
      `Failed to upload batch ${batchIndex + 1} after ${
        options.retryAttempts
      } attempts: ${lastError.message}`,
    );
  }

  /**
   * Upload a single batch of images
   * @param taskUuid Task UUID
   * @param batchImages Array of images in the batch
   * @param batchIndex Batch index
   */
  private async uploadBatch(
    taskUuid: string,
    batchImages: any[],
    batchIndex: number,
  ): Promise<void> {
    const formData = new FormData();

    // Add images to form data using streams
    for (const image of batchImages) {
      if (image.buffer) {
        // If image has buffer, create stream from buffer
        const imageStream = new Readable();
        imageStream.push(image.buffer);
        imageStream.push(null); // End stream

        formData.append("images", imageStream, {
          filename: image.originalname,
          contentType: image.mimetype,
        });
      } else if (image.url) {
        // If image has URL, stream from URL
        await this.appendImageFromUrl(formData, image);
      }
    }

    // Add batch metadata
    formData.append("batch_index", batchIndex.toString());
    formData.append("task_uuid", taskUuid);

    const headers = {
      ...formData.getHeaders(),
    };

    // Upload batch to NodeODM using multi-step upload endpoint
    await this.httpClient.post(`/task/new/upload/${taskUuid}`, formData, {
      headers,
      timeout: STREAMING_CONFIG.uploadTimeout,
    });

    this.logger.log(
      `Batch ${batchIndex + 1} uploaded successfully to task ${taskUuid}`,
    );
  }

  /**
   * Append image from URL to form data using streaming
   * @param formData FormData object
   * @param image Image object with URL
   */
  private async appendImageFromUrl(
    formData: FormData,
    image: { url: string; originalname: string; mimetype: string },
  ): Promise<void> {
    try {
      // Create a pass-through stream to avoid buffering
      const passThrough = new PassThrough();

      // Fetch image and pipe to pass-through stream
      const response = await axios.get(image.url, {
        responseType: "stream",
        timeout: STREAMING_CONFIG.imageDownloadTimeout,
      });

      // Pipe the response stream to pass-through
      response.data.pipe(passThrough);

      // Append to form data
      formData.append("images", passThrough, {
        filename: image.originalname,
        contentType: image.mimetype,
      });
    } catch (error) {
      this.logger.error(
        `Failed to stream image from URL ${image.url}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Utility function to delay execution
   * @param ms Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get memory usage statistics
   * @returns Memory usage info
   */
  getMemoryUsage(): any {
    const usage = process.memoryUsage();
    return {
      rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(usage.external / 1024 / 1024)} MB`,
    };
  }
}
