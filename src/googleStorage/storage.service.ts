/* eslint-disable no-useless-catch */
import { Injectable } from "@nestjs/common";
import { Storage } from "@google-cloud/storage";
import "multer";
import { Multer } from "multer";
import * as archiver from "archiver";
import * as stream from "stream";
import { ProjectService } from "src/project/project.service";
import prisma from "src/prisma";
import { ImageService } from "src/images/image.service";
import { GCSUploader } from "src/helpers/upload-processing/gcs-uploader";
import { AppLogger } from "src/common/logger/logger.service";
import axios from "axios";
import * as FormData from "form-data";
// import * as path from "path";
// import * as sharp from "sharp";

// Import new upload processing helpers
import {
  ImageProcessor,
  ParallelImageProcessor,
  MemoryOptimizedProcessor,
  UploadOptions,
  UploadResult,
} from "src/helpers/upload-processing";

@Injectable()
export class GcsUploadService {
  private storage: Storage;
  private projectService: ProjectService;
  private imageService: ImageService;
  private readonly projectId: string;
  private imageProcessor: ImageProcessor;
  private parallelImageProcessor: ParallelImageProcessor;
  private memoryOptimizedProcessor: MemoryOptimizedProcessor;
  private gcsUploader: GCSUploader;
  private logger: AppLogger;
  // Simple in-memory set to avoid concurrent zips per project in a single pod
  private activeZipProjects = new Set<number>();
  constructor() {
    const projectId = process.env.GCLOUD_PROJECT_ID;
    const keyFilename = process.env.GCS_KEYFILE_PATH;
    this.projectService = new ProjectService(prisma);
    this.storage = new Storage({ projectId, keyFilename });
    this.imageService = new ImageService(prisma);
    this.imageProcessor = new ImageProcessor();
    this.parallelImageProcessor = new ParallelImageProcessor();
    this.memoryOptimizedProcessor = new MemoryOptimizedProcessor();
    this.gcsUploader = new GCSUploader();
    this.logger = new AppLogger();
  }

  /**
   * Generate thumbnail using Sharp and upload to GCS
   */
  // private async generateAndUploadThumbnail(
  //   imageBuffer: Buffer,
  //   originalFileName: string,
  //   bucketName: string,
  // ): Promise<string> {
  //   try {
  //     // Clean filename of any protocol remnants
  //     let cleanFileName = originalFileName;
  //     if (cleanFileName.includes("https:")) {
  //       cleanFileName = cleanFileName.replace("https:", "");
  //     }
  //     if (cleanFileName.includes("http:")) {
  //       cleanFileName = cleanFileName.replace("http:", "");
  //     }

  //     const fileBaseName = path.basename(
  //       cleanFileName,
  //       path.extname(cleanFileName),
  //     );
  //     const thumbnailFileName = `thumbnails/${fileBaseName}_thumb_300.jpg`;

  //     // Generate thumbnail using Sharp
  //     const thumbnailBuffer = await sharp(imageBuffer)
  //       .resize(300, 300, {
  //         fit: "cover",
  //         position: "center",
  //       })
  //       .jpeg({ quality: 85 })
  //       .toBuffer();

  //     // Upload thumbnail to bucket
  //     const bucket = this.storage.bucket(bucketName);
  //     const thumbnailBlob = bucket.file(thumbnailFileName);

  //     await thumbnailBlob.save(thumbnailBuffer, {
  //       metadata: {
  //         contentType: "image/jpeg",
  //         cacheControl: "public, max-age=3600",
  //       },
  //     });

  //     await thumbnailBlob.makePublic();

  //     // Return thumbnail URL without https://
  //     return `storage.googleapis.com/${bucketName}/${thumbnailFileName}`;
  //   } catch (error) {
  //     console.warn("Error generating thumbnail:", error);
  //     return null;
  //   }
  // }

  async uploadFile(
    bucketName: string,
    file: Multer.File,
    firstname: string,
    lastname: string,
  ): Promise<string> {
    try {
      const folderPath = `${firstname}-${lastname}`;
      const fileName = file.originalname;

      const bucket = this.storage.bucket(bucketName);
      const blob = bucket.file(`${folderPath}/${fileName}`);
      const blobStream = blob.createWriteStream({
        resumable: false,
        gzip: true,
        metadata: {
          contentType: "image/jpeg",
          cacheControl: "no-cache", // Ensure the updated image is fetched
        },
      });

      return new Promise((resolve, reject) => {
        blobStream.on("error", (err) => {
          reject(err);
        });

        blobStream.on("finish", () => {
          const publicUrl = `https://storage.cloud.google.com/${bucket.name}/${blob.name}`;
          resolve(publicUrl);
        });

        blobStream.end(file.buffer);
      });
    } catch (err) {
      throw err;
    }
  }

  async uploadImages(
    bucketName: string,
    files: Multer.File[],
    projectId: number,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    try {
      const bucket = this.storage.bucket(bucketName);
      const folderName = `${projectId}/`;

      // Get project data
      const project = await this.projectService.getProjectById(projectId);

      // Process images using the memory-optimized processor for e2-small environments
      const { processedImages, failedImages, processingTime, memoryUsage } =
        await this.memoryOptimizedProcessor.processImagesMemoryOptimized(
          files,
          projectId,
          bucket,
          folderName,
          options,
        );

      // Extract drone metadata if needed
      const droneMetadata =
        await this.memoryOptimizedProcessor.extractDroneMetadataOptimized(
          files,
          options?.drone || false,
        );
      if (droneMetadata) {
        await this.projectService.editProject(projectId, {
          drone: droneMetadata,
        });
      }

      // Prepare data for database insertion
      const publicUrls = processedImages.map((img) => img.publicUrl);
      const imageNames = processedImages.map((img) => img.filename);
      const latitude = processedImages.map(
        (img) => img.latitude?.toString() || "",
      );
      const longitude = processedImages.map(
        (img) => img.longitude?.toString() || "",
      );
      const rgb = processedImages.map((img) => img.isRGB);

      const numberOfFiles = processedImages.length;

      // Update project image count
      this.projectService.updateImageCount(projectId, numberOfFiles);

      // Add images to database
      await this.imageService.addImages(
        publicUrls,
        projectId,
        imageNames,
        latitude,
        longitude,
        rgb,
      );

      // Update project coordinates if needed
      if (
        project.project.latitude === null &&
        project.project.longitude === null
      ) {
        for (let i = 0; i < Math.max(latitude.length, longitude.length); i++) {
          const lat = processedImages[i]?.latitude;
          const lng = processedImages[i]?.longitude;
          if (lat !== null && lng !== null) {
            await this.projectService.editProjectInspection(
              projectId,
              false,
              lat,
              lng,
            );
            break;
          }
        }
      } else {
        await this.projectService.editProjectInspection(projectId, false);
      }

      // Add panel audit log and statistics
      await this.imageService.PanelAuditLog(projectId, numberOfFiles);
      await this.imageService.PanelStatistics(
        projectId,
        numberOfFiles,
        0,
        false,
      );

      return {
        totalFiles: files.length,
        successfulUploads: numberOfFiles,
        failedUploads: failedImages.length,
        errors: failedImages,
        processingTime,
        memoryUsage,
      };
    } catch (err) {
      throw err;
    }
  }

  async zipAndUpload(
    bucketName: string,
    objectName: string,
    projectId: number,
  ) {
    // Allow disabling ZIP generation via env flag to protect small nodes
    if (process.env.DISABLE_PROJECT_ZIP === "true") {
      this.logger.warn(
        `DISABLE_PROJECT_ZIP=true: Skipping ZIP generation for project ${projectId}`,
      );
      return;
    }
    const bucket = this.storage.bucket(bucketName);
    const folderName = `${projectId}/`;
    const zipFilename = objectName.endsWith(".zip")
      ? objectName
      : `${objectName}.zip`;
    const zipPath = `${folderName}${zipFilename}`;
    const lockPath = `${folderName}${zipFilename}.lock`;

    // Concurrency guard within the same pod
    if (this.activeZipProjects.has(projectId)) {
      this.logger.warn(
        `ZIP already in progress for project ${projectId}, skipping duplicate start`,
      );
      return;
    }

    // Create a GCS lock file to signal work in progress across pods
    const lockFile = bucket.file(lockPath);
    try {
      const [exists] = await lockFile.exists();
      if (exists) {
        this.logger.warn(
          `Lock file exists for ${zipPath}, another worker is handling it. Skipping.`,
        );
        return;
      }
      await lockFile.save(Buffer.from("running"), {
        resumable: false,
        metadata: { contentType: "text/plain", cacheControl: "no-store" },
      });
    } catch (e) {
      this.logger.warn(
        `Could not create lock for ${zipPath}: ${
          e?.message || e
        }. Proceeding anyway but may race.`,
      );
    }

    this.activeZipProjects.add(projectId);

    // Create archiver with no compression (JPEGs/PNGs don't benefit, reduces CPU)
    const archive = archiver("zip", { zlib: { level: 0 } });

    const blob = bucket.file(zipPath);

    // Ensure any existing ZIP is removed before creating a new one
    try {
      const [exists] = await blob.exists();
      if (exists) {
        this.logger.info(
          `Existing ZIP found at ${zipPath}. Deleting before re-creating...`,
        );
        await blob.delete();
      }
    } catch (e: any) {
      this.logger.warn(
        `Failed checking/deleting existing ZIP at ${zipPath}: ${
          e?.message || e
        }`,
      );
      // Proceed anyway; creation will overwrite if possible
    }

    // GCS write stream (do not gzip a ZIP file)
    const blobStream = blob.createWriteStream({
      resumable: true,
      metadata: {
        contentType: "application/zip",
        cacheControl: "no-store",
      },
    });

    // Wire up error handling
    const done = new Promise<string>((resolve, reject) => {
      blobStream.on("error", (err) => reject(err));
      archive.on("error", (err) => reject(err));
      archive.on("warning", (err) => {
        // Non-blocking warnings from archiver
        console.warn("archiver warning", err);
      });
      blobStream.on("finish", async () => {
        try {
          await blob.makePublic();
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
          resolve(publicUrl);
        } catch (e) {
          reject(e);
        }
      });
    });
    this.logger.info(`Getting images by id: ${projectId}`);
    const files = await this.imageService.getImagesbyId(
      1,
      99999,
      +projectId,
      undefined,
      undefined,
      undefined,
      false,
    );
    this.logger.info(`Got ${files.images.length} images`);

    // Pipe and append files
    archive.pipe(blobStream);

    // Stream images from Google Cloud Storage into the ZIP with limited concurrency
    const maxConcurrent = Math.min(
      Math.max(parseInt(process.env.ZIP_READ_CONCURRENCY || "12", 10) || 12, 1),
      32,
    );
    this.logger.info(
      `Zipping with read concurrency = ${maxConcurrent} for project ${projectId}`,
    );

    const processOne = (image: { imageName?: string }) => {
      const filePathInBucket = `${folderName}${image.imageName}`;
      return new Promise<void>((resolve) => {
        try {
          if (!image.imageName) {
            this.logger.warn(
              `Skipping image with missing imageName in project ${projectId}`,
            );
            resolve();
            return;
          }
          const gcsFile = this.storage
            .bucket(bucketName)
            .file(filePathInBucket);
          const readStream = gcsFile.createReadStream({ validation: false });

          readStream.on("error", (err) => {
            this.logger.error(
              `Read stream error for ${filePathInBucket}: ${
                err?.message || err
              }`,
            );
            // Skip this file but do not fail whole ZIP
            resolve();
          });

          readStream.on("end", () => resolve());

          archive.append(readStream, { name: image.imageName });
        } catch (err) {
          this.logger.error(
            `Failed to append ${filePathInBucket} to archive: ${
              (err as any)?.message || err
            }`,
          );
          resolve();
        }
      });
    };

    for (let i = 0; i < files.images.length; i += maxConcurrent) {
      const batch = files.images.slice(i, i + maxConcurrent);
      await Promise.all(batch.map((img) => processOne(img)));
    }
    try {
      this.logger.info(`Finalizing archive`);
      await archive.finalize();
      this.logger.info(`Archive finalized`);
      await done;
      // After ZIP is completed, attempt to auto-start any queued Ortho task for this project
      await this.attemptStartQueuedOrtho(bucketName, projectId, zipPath);
    } finally {
      // Cleanup lock and active marker regardless of success
      try {
        await lockFile.delete({ ignoreNotFound: true } as any);
      } catch (e) {
        this.logger.warn(
          `Failed to delete lock ${lockPath}: ${e?.message || e}`,
        );
      }
      this.activeZipProjects.delete(projectId);
    }
  }

  /**
   * Attempt to start a queued orthomosaic task for the given project
   * immediately after ZIP completion. This is idempotent and safe across pods.
   */
  private async attemptStartQueuedOrtho(
    bucketName: string,
    projectId: number,
    zipPath: string,
  ): Promise<void> {
    try {
      // Find latest queued task for this project
      const queuedTask = await prisma.thermalProcessingTask.findFirst({
        where: { projectId, status: "queued" },
        orderBy: { createdAt: "desc" },
      });

      if (!queuedTask) {
        return; // nothing to start
      }

      // Atomically claim the task
      const claim = await prisma.thermalProcessingTask.updateMany({
        where: { id: queuedTask.id, status: "queued" },
        data: { status: "starting", updatedAt: new Date() },
      });
      if (claim.count !== 1) {
        return; // another worker claimed it
      }

      const nodeOdmBaseUrl =
        process.env.NODEODM_API_URL || "http://157.180.55.60:4000";
      const zipUrl = `https://storage.googleapis.com/${bucketName}/${zipPath}`;

      // Build multipart form for NodeODM /task/new
      const form = new FormData();
      form.append("zipurl", zipUrl);

      // Extract options and webhook from stored options
      const rawOptions: any = queuedTask.nodeOdmOptions || {};
      const { webhook, ...processingOptions } = rawOptions;
      const optionsArray = Object.entries(processingOptions).map(
        ([name, value]) => ({ name, value }),
      );
      form.append("options", JSON.stringify(optionsArray));
      if (webhook) {
        form.append("webhook", webhook);
      }

      const headers: Record<string, any> = {
        ...form.getHeaders(),
        "set-uuid": queuedTask.id,
      };

      await axios.post(`${nodeOdmBaseUrl}/task/new`, form, { headers });

      await prisma.thermalProcessingTask.update({
        where: { id: queuedTask.id },
        data: { status: "pending", updatedAt: new Date() },
      });

      this.logger.info(
        `Auto-started NodeODM for queued task ${queuedTask.id} with ZIP ${zipUrl}`,
      );
    } catch (e: any) {
      this.logger.error(
        `Auto-start NodeODM failed for project ${projectId}: ${
          e?.message || e
        }`,
      );
      // Mark task as failed to avoid indefinite queueing
      try {
        await prisma.thermalProcessingTask.updateMany({
          where: { projectId, status: "starting" },
          data: {
            status: "failed",
            errorMessage: `Failed to start NodeODM: ${e?.message || e}`,
            updatedAt: new Date(),
          },
        });
      } catch (_) {
        // ignore secondary failure
      }
    }
  }

  /**
   * Check ZIP status for a project: pending, in_progress, completed
   */
  async getZipStatus(
    bucketName: string,
    projectId: number,
    objectName?: string,
  ): Promise<{
    status: "pending" | "in_progress" | "completed";
    url?: string;
  }> {
    const bucket = this.storage.bucket(bucketName);
    const folderName = `${projectId}/`;
    const zipFilename =
      objectName && objectName.endsWith(".zip")
        ? objectName
        : `${projectId}.zip`;
    const zipPath = `${folderName}${zipFilename}`;
    const lockPath = `${zipPath}.lock`;

    const [zipExists] = await bucket.file(zipPath).exists();
    if (zipExists) {
      return {
        status: "completed",
        url: `https://storage.googleapis.com/${bucket.name}/${zipPath}`,
      };
    }

    const [lockExists] = await bucket.file(lockPath).exists();
    if (lockExists || this.activeZipProjects.has(projectId)) {
      return { status: "in_progress" };
    }

    return { status: "pending" };
  }

  async uploadUnhealthyPanels(
    bucketName: string,
    files: { image: string; imageId: any; panels: any; imageName: string }[],
    projectId: number,
    healthyPanels?: number[], // Add healthyPanels parameter
  ): Promise<any> {
    try {
      const bucket = this.storage.bucket(bucketName);
      let publicUrl;

      const folderName = projectId + "/";
      const uploadPromises = [];

      for (const file of files) {
        const base64Data = file.image.split(";base64,").pop();
        const buffer = Buffer.from(base64Data, "base64");

        const fileStream = new stream.PassThrough();
        fileStream.end(buffer);
        const originalname = file.imageName;
        const blob = bucket.file(folderName + originalname);
        const blobStream = blob.createWriteStream({
          resumable: false,
          gzip: true,
          metadata: {
            contentType: "image/jpeg",
            cacheControl: "no-cache, no-store, must-revalidate", // Ensure the updated image is fetched
          },
        });

        const promise = new Promise<string>((resolve, reject) => {
          blobStream.on("error", (err) => {
            reject(err);
          });

          blobStream.on("finish", async () => {
            await blob.makePublic();
            publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
            resolve(publicUrl);
          });

          fileStream.pipe(blobStream);
        });

        uploadPromises.push(promise);
      }

      // Process healthy images if provided
      if (healthyPanels && healthyPanels.length > 0) {
        await this.imageService.markImagesCompleted(healthyPanels, true);
      }

      const publicUrls = await Promise.all(uploadPromises);
      const numberOfFiles = publicUrls.length;

      // Process unhealthy images - mark them as completed and update panel information
      if (files.length > 0) {
        const unhealthyImageIds = files.map((file) => file.imageId);
        await this.imageService.markImagesCompleted(unhealthyImageIds, false);

        // Update panel information separately
        const panelUpdatePromises = files.map((file) => {
          return this.imageService.updateImage(file.imageId, {
            panelInformation: file.panels,
          });
        });
        await Promise.all(panelUpdatePromises);
      }

      // Update panel statistics
      if (files.length > 0 || (healthyPanels && healthyPanels.length > 0)) {
        await this.imageService.PanelStatistics(projectId, 0, 1);
      }

      return numberOfFiles;
    } catch (err) {
      throw err;
    }
  }
}
