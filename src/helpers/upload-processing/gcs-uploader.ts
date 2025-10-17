import { Bucket } from "@google-cloud/storage";
import { GCS_CONFIG, ERROR_MESSAGES } from "./upload-constants";
import { AppLogger } from "../../common/logger/logger.service";

export class GCSUploader {
  private logger = new AppLogger();

  /**
   * Upload buffer to Google Cloud Storage
   */
  async uploadToGCS(
    buffer: Buffer,
    filename: string,
    bucket: Bucket,
    folderName: string,
  ): Promise<string> {
    try {
      const fullPath = `${folderName}${filename}`;
      const blob = bucket.file(fullPath);

      const blobStream = blob.createWriteStream({
        ...GCS_CONFIG,
      });

      return new Promise<string>((resolve, reject) => {
        blobStream.on("error", (err) => {
          this.logger.error(`Upload failed for ${filename}:`, err);
          reject(new Error(`${ERROR_MESSAGES.UPLOAD_FAILED}: ${err.message}`));
        });

        blobStream.on("finish", async () => {
          try {
            blob.makePublic();
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
            this.logger.debug(
              `Successfully uploaded ${filename} to ${publicUrl}`,
            );
            resolve(publicUrl);
          } catch (error) {
            this.logger.error(
              `Failed to make blob public for ${filename}:`,
              error,
            );
            reject(new Error(`Failed to make blob public: ${error.message}`));
          }
        });

        blobStream.end(buffer);
      });
    } catch (error) {
      this.logger.error(`Error in uploadToGCS for ${filename}:`, error);
      throw new Error(`${ERROR_MESSAGES.UPLOAD_FAILED}: ${error.message}`);
    }
  }

  /**
   * Upload multiple files to GCS with retry logic
   */
  async uploadMultipleToGCS(
    files: Array<{ buffer: Buffer; filename: string }>,
    bucket: Bucket,
    folderName: string,
    retryAttempts: number = 3,
  ): Promise<
    Array<{
      filename: string;
      publicUrl: string;
      success: boolean;
      error?: string;
    }>
  > {
    const results = [];

    for (const file of files) {
      let lastError: string | undefined;

      for (let attempt = 1; attempt <= retryAttempts; attempt++) {
        try {
          const publicUrl = await this.uploadToGCS(
            file.buffer,
            file.filename,
            bucket,
            folderName,
          );
          results.push({
            filename: file.filename,
            publicUrl,
            success: true,
          });
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error.message;
          this.logger.warn(
            `Upload attempt ${attempt} failed for ${file.filename}: ${error.message}`,
          );

          if (attempt === retryAttempts) {
            results.push({
              filename: file.filename,
              publicUrl: "",
              success: false,
              error: lastError,
            });
          }
        }
      }
    }

    return results;
  }
}
