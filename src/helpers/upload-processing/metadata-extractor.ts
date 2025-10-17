import * as exifr from "exifr";
import { isThermalImage } from "../thermal-detection-helper";
import { GPSData, MetadataExtractionResult } from "./upload-interfaces";
import { AppLogger } from "../../common/logger/logger.service";

export class MetadataExtractor {
  private logger = new AppLogger();

  /**
   * Extract GPS and thermal/RGB classification from image buffer
   */
  async extractImageMetadata(
    buffer: Buffer,
    opts?: { filename?: string },
  ): Promise<MetadataExtractionResult> {
    try {
      // Extract GPS data
      const gpsData = await exifr.gps(buffer);
      const gps: GPSData = {
        latitude: gpsData?.latitude || null,
        longitude: gpsData?.longitude || null,
      };

      // Determine if image is thermal or RGB
      const isRGB = !(await isThermalImage(buffer, {
        filename: opts?.filename,
      }));

      // Keep extractor quiet; upstream processors log summaries if needed

      return {
        gps,
        isRGB,
      };
    } catch (error) {
      this.logger.error("Error extracting metadata:", error);
      // Return default values if extraction fails
      return {
        gps: { latitude: null, longitude: null },
        isRGB: true, // Default to RGB if we can't determine
      };
    }
  }

  /**
   * Extract drone metadata from image buffer
   */
  async extractDroneMetadata(buffer: Buffer): Promise<{
    imageDescription?: string;
    make?: string;
    model?: string;
  } | null> {
    try {
      const droneData = await exifr.parse(buffer);

      if (!droneData) {
        return null;
      }

      return {
        imageDescription: droneData.ImageDescription,
        make: droneData.Make,
        model: droneData.Model,
      };
    } catch (error) {
      this.logger.error("Error extracting drone metadata:", error);
      return null;
    }
  }
}
