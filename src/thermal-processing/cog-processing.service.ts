import { Injectable, Logger } from "@nestjs/common";
import { Storage } from "@google-cloud/storage";
import * as GeoTIFF from "geotiff";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

export interface CogMetadata {
  bounds: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  width: number;
  height: number;
  maxZoom: number;
  minZoom: number;
  crs: string;
  pixelSize: [number, number]; // [x, y] pixel size in CRS units
  geoTransform: number[]; // GDAL geotransform array
}

export interface CogProcessingResult {
  cogUrl: string;
  metadata: CogMetadata;
}

@Injectable()
export class CogProcessingService {
  private readonly logger = new Logger(CogProcessingService.name);
  private storage: Storage;

  constructor() {
    const projectId = process.env.GCLOUD_PROJECT_ID;
    const keyFilename = process.env.GCS_KEYFILE_PATH;
    this.storage = new Storage({ projectId, keyFilename });
  }

  /**
   * Process TIF buffer to create COG and extract metadata
   * @param tifBuffer TIF file buffer from NodeODM
   * @param projectId Project ID for folder organization
   * @param taskId Task ID for unique naming
   * @returns Promise with COG URL and spatial metadata
   */
  async processTifToCog(
    tifBuffer: Buffer,
    projectId: number,
    taskId: string,
  ): Promise<CogProcessingResult> {
    let tempTifPath: string;
    let tempCogPath: string;

    try {
      this.logger.log(
        `Processing TIF to COG for task ${taskId}, project ${projectId}`,
      );

      // Create temporary files
      const tempDir = os.tmpdir();
      tempTifPath = path.join(tempDir, `thermal-${taskId}.tif`);
      tempCogPath = path.join(tempDir, `thermal-cog-${taskId}.tif`);

      // Write TIF buffer to temporary file
      fs.writeFileSync(tempTifPath, new Uint8Array(tifBuffer));

      // Extract metadata from original TIF
      const metadata = await this.extractSpatialMetadata(
        tempTifPath,
        tifBuffer,
      );

      // Convert TIF to COG using GDAL
      await this.convertToCog(tempTifPath, tempCogPath);

      // Read COG file and upload to GCS
      const cogBuffer = fs.readFileSync(tempCogPath);
      const cogUrl = await this.uploadCogToGCS(cogBuffer, projectId, taskId);

      this.logger.log(`COG processing completed successfully: ${cogUrl}`);
      return { cogUrl, metadata };
    } catch (error) {
      this.logger.error(
        `Failed to process TIF to COG for task ${taskId}:`,
        error,
      );
      throw error;
    } finally {
      // Clean up temporary files
      if (tempTifPath && fs.existsSync(tempTifPath)) {
        fs.unlinkSync(tempTifPath);
      }
      if (tempCogPath && fs.existsSync(tempCogPath)) {
        fs.unlinkSync(tempCogPath);
      }
    }
  }

  /**
   * Convert TIF to Cloud Optimized GeoTIFF using GDAL
   * @param inputPath Path to input TIF file
   * @param outputPath Path for output COG file
   */
  private async convertToCog(
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    try {
      this.logger.log(`Converting TIF to COG: ${inputPath} -> ${outputPath}`);

      // Use GDAL translate to create COG
      const gdalCommand = [
        "gdal_translate",
        "-of COG",
        "-co BLOCKSIZE=256",
        "-co COMPRESS=DEFLATE",
        "-co NUM_THREADS=ALL_CPUS",
        "-co BIGTIFF=IF_SAFER",
        "-co RESAMPLING=NEAREST",
        `"${inputPath}"`,
        `"${outputPath}"`,
      ].join(" ");

      this.logger.debug(`Executing GDAL command: ${gdalCommand}`);

      const { stdout, stderr } = await execAsync(gdalCommand);

      if (stderr && !stderr.includes("Warning")) {
        this.logger.warn(`GDAL stderr: ${stderr}`);
      }

      if (stdout) {
        this.logger.debug(`GDAL stdout: ${stdout}`);
      }

      if (!fs.existsSync(outputPath)) {
        throw new Error("COG file was not created successfully");
      }

      this.logger.log("COG conversion completed successfully");
    } catch (error) {
      this.logger.error("Failed to convert TIF to COG:", error);

      // Fallback: try with rio-cogeo if available
      try {
        await this.convertToCogFallback(inputPath, outputPath);
      } catch (fallbackError) {
        this.logger.error(
          "Fallback COG conversion also failed:",
          fallbackError,
        );
        throw new Error(`COG conversion failed: ${error.message}`);
      }
    }
  }

  /**
   * Fallback COG conversion method using rio-cogeo
   * @param inputPath Path to input TIF file
   * @param outputPath Path for output COG file
   */
  private async convertToCogFallback(
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    try {
      this.logger.log("Attempting fallback COG conversion with rio-cogeo");

      const rioCogeoCommand = [
        "rio cogeo create",
        "--cog-profile deflate",
        "--overview-resampling nearest",
        "--overview-blocksize 256",
        `"${inputPath}"`,
        `"${outputPath}"`,
      ].join(" ");

      const { stderr } = await execAsync(rioCogeoCommand);

      if (stderr && !stderr.includes("Warning")) {
        this.logger.warn(`Rio-cogeo stderr: ${stderr}`);
      }

      this.logger.log("Fallback COG conversion completed successfully");
    } catch (error) {
      throw new Error(`Fallback COG conversion failed: ${error.message}`);
    }
  }

  /**
   * Extract spatial metadata from TIF file
   * @param tifPath Path to TIF file
   * @param tifBuffer TIF file buffer (for geotiff library)
   * @returns Spatial metadata including bounds, zoom levels, etc.
   */
  private async extractSpatialMetadata(
    tifPath: string,
    tifBuffer: Buffer,
  ): Promise<CogMetadata> {
    try {
      this.logger.log("Extracting spatial metadata from TIF");

      // Use gdalinfo to get detailed spatial information
      const gdalsrsInfoCommand = `gdalinfo -json "${tifPath}"`;
      const { stdout } = await execAsync(gdalsrsInfoCommand);
      const gdalInfo = JSON.parse(stdout);

      // Extract basic information
      const { size, geoTransform, coordinateSystem } = gdalInfo;
      const [width, height] = size;

      // Calculate bounds from geotransform
      const [originX, pixelSizeX, , originY, , pixelSizeY] = geoTransform;

      const minLng = originX;
      const maxLat = originY;
      const maxLng = originX + width * pixelSizeX;
      const minLat = originY + height * pixelSizeY;

      const bounds: [number, number, number, number] = [
        minLng,
        minLat,
        maxLng,
        maxLat,
      ];

      // Calculate zoom levels based on pixel size and image dimensions
      const pixelSize: [number, number] = [
        Math.abs(pixelSizeX),
        Math.abs(pixelSizeY),
      ];
      const { maxZoom, minZoom } = this.calculateZoomLevels();

      // Extract CRS information
      const crs = coordinateSystem?.wkt || "EPSG:4326";

      const metadata: CogMetadata = {
        bounds,
        width,
        height,
        maxZoom,
        minZoom,
        crs,
        pixelSize,
        geoTransform,
      };

      this.logger.log(`Extracted metadata: ${JSON.stringify(metadata)}`);
      return metadata;
    } catch (error) {
      this.logger.error("Failed to extract spatial metadata:", error);

      // Fallback to basic metadata extraction using geotiff library
      return this.extractBasicMetadata(tifBuffer);
    }
  }

  /**
   * Fallback method to extract basic metadata using geotiff library
   * @param tifBuffer TIF file buffer
   * @returns Basic spatial metadata
   */
  private async extractBasicMetadata(tifBuffer: Buffer): Promise<CogMetadata> {
    try {
      this.logger.log("Using fallback metadata extraction method");

      const arrayBuffer = tifBuffer.buffer.slice(
        tifBuffer.byteOffset,
        tifBuffer.byteOffset + tifBuffer.byteLength,
      ) as ArrayBuffer;
      const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
      const image = await tiff.getImage();

      const width = image.getWidth();
      const height = image.getHeight();
      const bbox = image.getBoundingBox();

      // Default zoom levels for fallback - fixed range 8 to 50
      const maxZoom = 50;
      const minZoom = 8;

      const bounds: [number, number, number, number] = [
        bbox[0], // minLng
        bbox[1], // minLat
        bbox[2], // maxLng
        bbox[3], // maxLat
      ];

      return {
        bounds,
        width,
        height,
        maxZoom,
        minZoom,
        crs: "EPSG:4326", // Default CRS
        pixelSize: [(bbox[2] - bbox[0]) / width, (bbox[3] - bbox[1]) / height],
        geoTransform: [
          bbox[0],
          (bbox[2] - bbox[0]) / width,
          0,
          bbox[3],
          0,
          -(bbox[3] - bbox[1]) / height,
        ],
      };
    } catch (error) {
      this.logger.error("Fallback metadata extraction failed:", error);

      // Ultimate fallback with default values
      return {
        bounds: [0, 0, 1, 1],
        width: 1024,
        height: 1024,
        maxZoom: 50,
        minZoom: 8,
        crs: "EPSG:4326",
        pixelSize: [1, 1],
        geoTransform: [0, 1, 0, 1, 0, -1],
      };
    }
  }

  /**
   * Calculate appropriate zoom levels - fixed range from 8 to 50
   * @returns Min and max zoom levels
   */
  private calculateZoomLevels(): { maxZoom: number; minZoom: number } {
    // Simple fixed zoom range from 8 to 50
    return { maxZoom: 50, minZoom: 8 };
  }

  /**
   * Upload COG buffer to Google Cloud Storage
   * @param cogBuffer COG file buffer
   * @param projectId Project ID for folder organization
   * @param taskId Task ID for unique naming
   * @returns Promise with public URL
   */
  private async uploadCogToGCS(
    cogBuffer: Buffer,
    projectId: number,
    taskId: string,
  ): Promise<string> {
    try {
      const bucketName = process.env.GCS_BUCKET_NAME || "your-default-bucket";
      const bucket = this.storage.bucket(bucketName);

      // Use the same folder structure: projectId/filename
      const fileName = `${projectId}/thermal-orthomosaic-${taskId}.tif`;

      const blob = bucket.file(fileName);
      const blobStream = blob.createWriteStream({
        resumable: false,
        gzip: true,
        metadata: {
          contentType: "image/tiff",
          cacheControl: "public, max-age=3600", // Cache for 1 hour
          metadata: {
            projectId: projectId.toString(),
            taskId: taskId,
            type: "thermal-orthomosaic-cog",
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
              `Failed to make COG file public for task ${taskId}:`,
              error,
            );
            reject(error);
          }
        });

        // Write the COG buffer
        blobStream.end(cogBuffer);
      });
    } catch (error) {
      this.logger.error(
        `Failed to upload COG to GCS for task ${taskId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Delete COG file from Google Cloud Storage
   * @param cogUrl Public URL of the COG file to delete
   * @returns Promise<void>
   */
  async deleteCogFile(cogUrl: string): Promise<void> {
    try {
      // Parse the bucket name and file name from the public URL
      const urlParts = cogUrl
        .replace("https://storage.googleapis.com/", "")
        .split("/");
      const bucketName = urlParts[0];
      const fileName = urlParts.slice(1).join("/");

      // Get a reference to the bucket and the file
      const bucket = this.storage.bucket(bucketName);
      const file = bucket.file(fileName);

      // Delete the file
      await file.delete();
      this.logger.log(`Deleted COG file: ${cogUrl}`);
    } catch (error) {
      this.logger.error(`Failed to delete COG file ${cogUrl}:`, error);
      throw error;
    }
  }

  /**
   * Validate that a file is a valid COG
   * @param filePath Path to the file to validate
   * @returns Promise<boolean>
   */
  async validateCog(filePath: string): Promise<boolean> {
    try {
      const gdalInfoCommand = `gdalinfo -json "${filePath}"`;
      const { stdout } = await execAsync(gdalInfoCommand);
      const info = JSON.parse(stdout);

      // Check for COG-specific characteristics
      const isTiled = info.metadata?.IMAGE_STRUCTURE?.TILED === "YES";

      return isTiled; // Minimum requirement for COG
    } catch (error) {
      this.logger.warn(`COG validation failed for ${filePath}:`, error);
      return false;
    }
  }
}
