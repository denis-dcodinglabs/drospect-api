/**
 * Example usage of streaming upload for large image batches
 * This demonstrates how to use the streaming upload service for 2K+ images
 */

import { StreamingUploadService } from "./streaming-upload.service";
import { NodeOdmService } from "./nodeodm.service";

export class StreamingUploadExample {
  private streamingService: StreamingUploadService;
  private nodeOdmService: NodeOdmService;

  constructor() {
    this.streamingService = new StreamingUploadService();
    this.nodeOdmService = new NodeOdmService();
  }

  /**
   * Example: Process 2K images using multi-step streaming upload
   */
  async processLargeBatch() {
    const images = []; // Array of 2000+ images
    const options = {
      "orthophoto-png": true,
      "pc-ept": true,
      cog: true,
      split: 100, // Process in chunks of 100
      "split-overlap": 50,
    };

    try {
      console.log("Starting multi-step streaming upload for 2K images...");

      // Use multi-step streaming upload with progress tracking
      const result = await this.streamingService.streamUploadToNodeOdm(
        images,
        options,
        undefined, // Let NodeODM generate UUID
        (progress) => {
          console.log(
            `Upload Progress: ${progress.percentage}% (${progress.uploadedImages}/${progress.totalImages})`,
          );
          console.log(
            `Batch: ${progress.currentBatch}/${progress.totalBatches}`,
          );

          // Log memory usage every 10%
          if (progress.percentage % 10 === 0) {
            const memoryUsage = this.streamingService.getMemoryUsage();
            console.log(`Memory Usage: ${memoryUsage.heapUsed}`);
          }
        },
      );

      console.log(`Multi-step upload completed! Task UUID: ${result.uuid}`);

      // Monitor processing progress
      await this.monitorProcessing(result.uuid);
    } catch (error) {
      console.error("Multi-step streaming upload failed:", error);
    }
  }

  /**
   * Example: Process images using zip URL for bulk upload
   */
  async processWithZipUrl() {
    const zipurl = "https://example.com/images.zip"; // URL to zip file containing images
    const options = {
      "orthophoto-png": true,
      cog: true,
      split: 80,
      "split-overlap": 30,
      zipurl: zipurl, // Use zip URL for bulk upload
    };

    try {
      console.log("Starting bulk upload using zip URL...");

      // Use multi-step streaming upload with zip URL
      const result = await this.streamingService.streamUploadToNodeOdm(
        [], // Empty array since we're using zipurl
        options,
        undefined,
        (progress) => {
          console.log(`Bulk upload progress: ${progress.percentage}%`);
        },
      );

      console.log(`Bulk upload completed! Task UUID: ${result.uuid}`);

      // Monitor processing progress
      await this.monitorProcessing(result.uuid);
    } catch (error) {
      console.error("Bulk upload with zip URL failed:", error);
    }
  }

  /**
   * Example: Process existing project images using streaming
   */
  async processExistingProjectImages(projectId: number) {
    // Get thermal images from database
    const thermalImages = await this.getThermalImagesFromProject(projectId);

    if (thermalImages.length > 100) {
      console.log(`Large project detected: ${thermalImages.length} images`);

      // Convert to URL format for streaming
      const imageUrls = thermalImages.map((image) => ({
        url: image.image,
        originalname: image.imageName,
        mimetype: "image/jpeg",
      }));

      const options = {
        "orthophoto-png": true,
        cog: true,
        split: 80,
        "split-overlap": 30,
      };

      // Use streaming upload
      const result = await this.streamingService.streamUploadToNodeOdm(
        imageUrls,
        options,
        undefined,
        (progress) => {
          console.log(`Streaming Progress: ${progress.percentage}%`);
        },
      );

      return result;
    } else {
      // Use regular upload for smaller batches
      const nodeOdmOptions = {
        "orthophoto-png": true,
        cog: true,
        split: 80,
        "split-overlap": 30,
      };
      return await this.nodeOdmService.createTask(
        thermalImages,
        nodeOdmOptions,
      );
    }
  }

  /**
   * Monitor NodeODM processing progress
   */
  private async monitorProcessing(taskUuid: string) {
    let isCompleted = false;
    let attempts = 0;
    const maxAttempts = 1000; // Prevent infinite loop

    while (!isCompleted && attempts < maxAttempts) {
      try {
        const taskInfo = await this.nodeOdmService.getTaskInfo(taskUuid);

        console.log(`Processing Progress: ${taskInfo.progress}%`);
        console.log(`Status: ${taskInfo.status.code}`);

        if (taskInfo.status.code === 40) {
          // Completed
          isCompleted = true;
          console.log("Processing completed!");

          // Download results
          const results = await this.nodeOdmService.downloadTaskResult(
            taskUuid,
          );
          console.log(`Results downloaded: ${results.length} bytes`);
        } else if (taskInfo.status.code === 50 || taskInfo.status.code === 30) {
          // Failed
          console.error("Processing failed:", taskInfo);
          break;
        }

        // Wait 30 seconds before next check
        await new Promise((resolve) => setTimeout(resolve, 30000));
        attempts++;
      } catch (error) {
        console.error("Error monitoring task:", error);
        attempts++;
      }
    }
  }

  /**
   * Mock function to get thermal images from project
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getThermalImagesFromProject(_projectId: number) {
    // This would be replaced with actual database query
    return [];
  }
}

/**
 * Environment variables to configure streaming upload:
 *
 * STREAMING_BATCH_SIZE=50                    # Images per batch
 * STREAMING_MAX_CONCURRENT_BATCHES=2         # Concurrent batch uploads
 * STREAMING_RETRY_ATTEMPTS=3                 # Retry attempts per batch
 * STREAMING_RETRY_DELAY=5000                 # Delay between retries (ms)
 * STREAMING_UPLOAD_TIMEOUT=1800000           # Upload timeout (ms)
 * STREAMING_IMAGE_DOWNLOAD_TIMEOUT=30000     # Image download timeout (ms)
 * STREAMING_MAX_MEMORY_USAGE=2048            # Max memory usage (MB)
 * STREAMING_ENABLE_MEMORY_MONITORING=true    # Enable memory monitoring
 * STREAMING_MAX_CONCURRENT_DOWNLOADS=10      # Concurrent downloads
 * STREAMING_CONNECTION_TIMEOUT=60000         # Connection timeout (ms)
 */
