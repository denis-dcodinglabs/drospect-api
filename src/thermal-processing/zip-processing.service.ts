import { Injectable, Logger } from "@nestjs/common";
import { Storage } from "@google-cloud/storage";
import * as unzipper from "unzipper";
import * as stream from "stream";

export interface OrthomosaicFiles {
  pngBuffer?: Buffer;
  tifBuffer?: Buffer;
  pngFileName?: string;
  tifFileName?: string;
}

export interface OrthomosaicProcessingResult {
  pngUrl?: string;
  tifBuffer?: Buffer;
  tifFileName?: string;
}

@Injectable()
export class ZipProcessingService {
  private readonly logger = new Logger(ZipProcessingService.name);
  private storage: Storage;

  constructor() {
    const projectId = process.env.GCLOUD_PROJECT_ID;
    const keyFilename = process.env.GCS_KEYFILE_PATH;
    this.storage = new Storage({ projectId, keyFilename });
  }

  /**
   * Extract orthomosaic image from ZIP buffer and upload to Google Cloud Storage
   * @param zipBuffer ZIP file buffer from NodeODM
   * @param projectId Project ID for folder organization
   * @param taskId Task ID for unique naming
   * @returns Promise with public URL of uploaded orthomosaic image
   */
  async processOrthomosaicZip(
    zipBuffer: Buffer,
    projectId: number,
    taskId: string,
  ): Promise<string> {
    try {
      this.logger.log(
        `Processing ZIP file for task ${taskId}, project ${projectId}`,
      );

      // Extract ZIP file
      const directory = await unzipper.Open.buffer(zipBuffer);

      // Find the orthomosaic image file
      const orthomosaicFile = this.findOrthomosaicFile(directory.files);

      if (!orthomosaicFile) {
        throw new Error("No orthomosaic image found in ZIP file");
      }

      this.logger.log(`Found orthomosaic file: ${orthomosaicFile.path}`);

      // Extract the image buffer
      const imageBuffer = await orthomosaicFile.buffer();

      // Upload to Google Cloud Storage
      const publicUrl = await this.uploadToGCS(imageBuffer, projectId, taskId);

      this.logger.log(`Orthomosaic uploaded successfully: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      this.logger.error(
        `Failed to process orthomosaic ZIP for task ${taskId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Extract both PNG and TIF orthomosaic files from ZIP buffer for COG processing
   * @param zipBuffer ZIP file buffer from NodeODM
   * @param projectId Project ID for folder organization
   * @param taskId Task ID for unique naming
   * @returns Promise with PNG URL and TIF buffer for COG processing
   */
  async processOrthomosaicZipWithCog(
    zipBuffer: Buffer,
    projectId: number,
    taskId: string,
  ): Promise<OrthomosaicProcessingResult> {
    try {
      this.logger.log(
        `Processing ZIP file with COG support for task ${taskId}, project ${projectId}`,
      );

      // Extract ZIP file
      const directory = await unzipper.Open.buffer(zipBuffer);

      // Find both PNG and TIF orthomosaic files
      const orthomosaicFiles = await this.findOrthomosaicFiles(directory.files);

      if (!orthomosaicFiles.pngBuffer && !orthomosaicFiles.tifBuffer) {
        throw new Error("No orthomosaic image found in ZIP file");
      }

      const result: OrthomosaicProcessingResult = {};

      // Process PNG file if available
      if (orthomosaicFiles.pngBuffer) {
        this.logger.log(
          `Found PNG orthomosaic: ${orthomosaicFiles.pngFileName}`,
        );
        result.pngUrl = await this.uploadToGCS(
          orthomosaicFiles.pngBuffer,
          projectId,
          taskId,
        );
        this.logger.log(`PNG orthomosaic uploaded: ${result.pngUrl}`);
      }

      // Return TIF buffer for COG processing if available
      if (orthomosaicFiles.tifBuffer) {
        this.logger.log(
          `Found TIF orthomosaic: ${orthomosaicFiles.tifFileName}`,
        );
        result.tifBuffer = orthomosaicFiles.tifBuffer;
        result.tifFileName = orthomosaicFiles.tifFileName;
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to process orthomosaic ZIP with COG for task ${taskId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Find both PNG and TIF orthomosaic files in the ZIP directory
   * @param files Array of files from unzipper
   * @returns Object with PNG and TIF buffers
   */
  private async findOrthomosaicFiles(files: any[]): Promise<OrthomosaicFiles> {
    const result: OrthomosaicFiles = {};

    for (const file of files) {
      // Skip directories and system files
      if (
        file.type === "Directory" ||
        file.path.startsWith("__MACOSX/") ||
        file.path.startsWith("._")
      ) {
        continue;
      }

      // Check for PNG orthomosaic
      if (file.path.endsWith("odm_orthophoto.png")) {
        this.logger.log(`Found PNG orthomosaic at: ${file.path}`);
        result.pngBuffer = await file.buffer();
        result.pngFileName = "odm_orthophoto.png";
      }

      // Check for COG/TIF orthomosaic (NodeODM may append _cog)
      if (
        file.path.endsWith("odm_orthophoto.tif") ||
        file.path.endsWith("odm_orthophoto.tiff") ||
        file.path.endsWith("odm_orthophoto_cog.tif") ||
        file.path.endsWith("odm_orthophoto_cog.tiff") ||
        file.path.endsWith("orthophoto_cog.tif") ||
        file.path.endsWith("orthophoto_cog.tiff")
      ) {
        this.logger.log(`Found TIF orthomosaic at: ${file.path}`);
        result.tifBuffer = await file.buffer();
        result.tifFileName = file.path.split("/").pop() || "odm_orthophoto.tif";
      }
    }

    if (!result.pngBuffer && !result.tifBuffer) {
      this.logger.error("No orthomosaic files found in ZIP");
      this.logger.log(
        "Available files in ZIP:",
        files.map((f) => f.path),
      );
    }

    return result;
  }

  /**
   * Find the orthomosaic image file in the ZIP directory
   * @param files Array of files from unzipper
   * @returns The orthomosaic file or null if not found
   */
  private findOrthomosaicFile(files: any[]): any | null {
    // Look specifically for odm_orthophoto.png
    for (const file of files) {
      // Skip directories and system files
      if (
        file.type === "Directory" ||
        file.path.startsWith("__MACOSX/") ||
        file.path.startsWith("._")
      ) {
        continue;
      }

      // Check if this is the odm_orthophoto.png file
      if (file.path.endsWith("odm_orthophoto.png")) {
        this.logger.log(`Found odm_orthophoto.png at: ${file.path}`);
        return file;
      }
    }

    this.logger.error("odm_orthophoto.png not found in ZIP file");
    this.logger.log(
      "Available files in ZIP:",
      files.map((f) => f.path),
    );
    return null;
  }

  /**
   * Upload image buffer to Google Cloud Storage
   * @param imageBuffer Image buffer to upload
   * @param projectId Project ID for folder organization
   * @param taskId Task ID for unique naming
   * @returns Promise with public URL
   */
  private async uploadToGCS(
    imageBuffer: Buffer,
    projectId: number,
    taskId: string,
  ): Promise<string> {
    try {
      const bucketName = process.env.GCS_BUCKET_NAME || "your-default-bucket";
      const bucket = this.storage.bucket(bucketName);

      // Use the same folder structure as other project images: projectId/filename
      // Keep the PNG extension since odm_orthophoto.png is always PNG
      const fileName = `${projectId}/thermal-orthomosaic-${taskId}.png`;

      const blob = bucket.file(fileName);
      const blobStream = blob.createWriteStream({
        resumable: false,
        gzip: true,
        metadata: {
          contentType: "image/png",
          cacheControl: "no-cache", // Same as other images in the project
          metadata: {
            projectId: projectId.toString(),
            taskId: taskId,
            type: "thermal-orthomosaic",
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      return new Promise((resolve, reject) => {
        blobStream.on("error", (err) => {
          this.logger.error(`Upload error for task ${taskId}:`, err);
          reject(err);
        });

        blobStream.on("finish", async () => {
          try {
            // Make the file publicly accessible
            await blob.makePublic();
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
            resolve(publicUrl);
          } catch (error) {
            this.logger.error(
              `Failed to make file public for task ${taskId}:`,
              error,
            );
            reject(error);
          }
        });

        // Create a stream from the buffer and pipe it to GCS
        const bufferStream = new stream.PassThrough();
        bufferStream.end(imageBuffer);
        bufferStream.pipe(blobStream);
      });
    } catch (error) {
      this.logger.error(`Failed to upload to GCS for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Get appropriate content type for file extension
   * @param extension File extension
   * @returns Content type string
   */
  private getContentType(extension: string): string {
    switch (extension.toLowerCase()) {
      case ".tif":
      case ".tiff":
        return "image/tiff";
      case ".png":
        return "image/png";
      case ".jpg":
      case ".jpeg":
        return "image/jpeg";
      default:
        return "application/octet-stream";
    }
  }

  /**
   * Delete orthomosaic file from Google Cloud Storage
   * @param publicUrl Public URL of the file to delete
   * @returns Promise<void>
   */
  async deleteOrthomosaicFile(publicUrl: string): Promise<void> {
    try {
      // Parse the bucket name and file name from the public URL
      const urlParts = publicUrl
        .replace("https://storage.googleapis.com/", "")
        .split("/");
      const bucketName = urlParts[0];
      const fileName = urlParts.slice(1).join("/");

      // Get a reference to the bucket and the file
      const bucket = this.storage.bucket(bucketName);
      const file = bucket.file(fileName);

      // Delete the file
      await file.delete();
      this.logger.log(`Deleted orthomosaic file: ${publicUrl}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete orthomosaic file ${publicUrl}:`,
        error,
      );
      throw error;
    }
  }
}
