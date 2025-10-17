import * as exifr from "exifr";
import { AppLogger } from "../common/logger/logger.service";

/**
 * Determines if an image is thermal based on EXIF metadata
 * Uses the exact same logic as the frontend implementation
 * @param {Buffer} imageBuffer - The image buffer to analyze
 * @returns {Promise<boolean>} - True if the image is thermal, false if RGB
 */
export async function isThermalImage(
  imageBuffer: Buffer,
  opts?: { filename?: string },
): Promise<boolean> {
  const logger = new AppLogger();

  try {
    const filename = opts?.filename;
    const looksThermalByName = filename
      ? /^(.*)_T\.(jpe?g|png)$/i.test(filename)
      : undefined;
    // looksRgbByName intentionally not used in filename-first policy

    // 1) Filename-first policy
    if (filename) {
      if (looksThermalByName) {
        return true;
      }
      return false;
    }

    // 2) Minimal EXIF fallback (when filename is not available)
    const exifData = await exifr.parse(imageBuffer);
    if (!exifData) return false;

    const hasThermalData = !!(
      (exifData as any)["Thermal Data"] ||
      (exifData as any)["Thermal Calibration"] ||
      (exifData as any).RawThermalImage ||
      (exifData as any).ThermalData ||
      (exifData as any).ThermalCalibration
    );

    if (hasThermalData) return true;

    const desc =
      ((exifData as any)["Image Description"]?.toLowerCase?.() as
        | string
        | undefined) ||
      ((exifData as any).ImageDescription?.toLowerCase?.() as
        | string
        | undefined) ||
      "";

    if (
      desc.includes("whitehot") ||
      desc.includes("blackhot") ||
      desc.includes("redhot") ||
      desc.includes("yellowhot") ||
      desc.includes("rainbow") ||
      desc.includes("ironbow") ||
      desc.includes("ironred")
    ) {
      return true;
    }

    // 3) Heuristic fallback: if name suggested thermal and EXIF did not, prefer thermal
    if (looksThermalByName && !hasThermalData) return true;

    return false;
  } catch (error) {
    logger.error("[isThermalImage:BE] Error detecting thermal image:", error);
    return false;
  }
}

/**
 * Checks if an image has metadata (EXIF data)
 * Uses the same logic as the frontend implementation
 * @param {Buffer} imageBuffer - The image buffer to analyze
 * @returns {Promise<boolean>} - True if the image has metadata
 */
export async function hasMetadata(imageBuffer: Buffer): Promise<boolean> {
  const logger = new AppLogger();

  try {
    const exifData = await exifr.parse(imageBuffer);

    // Check if ANY EXIF data exists
    const hasAnyExifData = exifData && Object.keys(exifData).length > 0;

    return !!hasAnyExifData;
  } catch (error) {
    logger.error("Error checking metadata:", error);
    return false;
  }
}
