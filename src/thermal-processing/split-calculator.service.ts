import { Injectable, Logger } from "@nestjs/common";

export type FlightType = "low" | "rooftop" | "high";

export interface SplitCalculationOptions {
  availableRAM?: number;
  ramPerImage?: number;
  maxImagesPerChunk?: number;
  referenceAlt?: number;
  referenceFootprint?: number;
  overlapRatio?: number;
  /**
   * Optional hard cap (in meters) for the generated --split-overlap value. If
   * the calculated overlap exceeds this number, it will be limited to this
   * value. Use this to avoid extremely large overlaps (hundreds of metres)
   * which can blow up processing time / memory on small servers.
   */
  maxOverlapMeters?: number;
}

export interface SplitSettings {
  chunks: number;
  imagesPerChunk: number;
  overlapMeters: number;
}

@Injectable()
export class SplitCalculatorService {
  private readonly logger = new Logger(SplitCalculatorService.name);

  /**
   * Calculate split settings for a NodeODM job.
   *
   * @param imageCount Total number of images in your job.
   * @param flightType One of the three altitude bands:
   *                   - "low"      → 15–20 m
   *                   - "rooftop"  → 20–30 m
   *                   - "high"     → 35–45 m
   * @param opts Optional configuration options
   * @returns Split settings with chunks, imagesPerChunk, and overlapMeters
   */
  calculateSplitSettings(
    imageCount: number,
    flightType: FlightType,
    opts: SplitCalculationOptions = {},
  ): SplitSettings {
    // Always use 64GB RAM as default
    const availableRAM = 64;
    const {
      ramPerImage = 0.064,
      maxImagesPerChunk = 500, // Allow larger chunks for high RAM
      referenceAlt = 20,
      referenceFootprint = 100,
      overlapRatio = 0.15,
      maxOverlapMeters = 100,
    } = opts;

    // < 2,000 images: Do NOT split
    if (imageCount <= 2000) {
      return {
        chunks: 1,
        imagesPerChunk: imageCount,
        overlapMeters: 0,
      };
    }

    // 2,000–4,000 images: Try one task; only split if memory errors (handled outside)
    if (imageCount > 2000 && imageCount <= 4000) {
      return {
        chunks: 1,
        imagesPerChunk: imageCount,
        overlapMeters: 0,
      };
    }

    // > 4,000 images: Split into largest possible chunks
    const expectedRAM = imageCount * ramPerImage; // GB needed total
    const byRAM = Math.ceil(expectedRAM / availableRAM);
    const bySize = Math.ceil(imageCount / maxImagesPerChunk);
    const chunks = Math.max(1, byRAM, bySize);
    const imagesPerChunk = Math.ceil(imageCount / chunks);

    // Compute overlap
    const meanAltitudes = {
      low: 17.5,
      rooftop: 25,
      high: 40,
    };
    const altitude = meanAltitudes[flightType];
    const scaledFootprint = referenceFootprint * (altitude / referenceAlt);
    const clusterExtent = scaledFootprint * Math.sqrt(imagesPerChunk);
    const rawOverlap = Math.round(clusterExtent * overlapRatio);
    const overlapMeters = Math.min(rawOverlap, maxOverlapMeters);

    return {
      chunks,
      imagesPerChunk,
      overlapMeters,
    };
  }

  /**
   * Get the flight type based on project metadata or user selection
   * This is a helper method that can be used to determine flight type
   *
   * @param model The model type stored in database ("LOW", "HIGH", "ROOF")
   * @returns FlightType for split calculations
   */
  getFlightTypeFromModel(model: string): FlightType {
    switch (model?.toUpperCase()) {
      case "LOW":
        return "low";
      case "HIGH":
        return "high";
      case "ROOF":
      case "ROOFTOP":
        return "rooftop";
      default:
        this.logger.warn(
          `Unknown model type: ${model}, defaulting to 'rooftop'`,
        );
        return "rooftop"; // Default to rooftop as middle ground
    }
  }

  /**
   * Get default split calculation options based on server configuration
   *
   * @returns Default options for split calculation
   */
  getDefaultCalculationOptions(): SplitCalculationOptions {
    return {
      availableRAM: Number(process.env.NODEODM_AVAILABLE_RAM) || 8,
      ramPerImage: Number(process.env.NODEODM_RAM_PER_IMAGE) || 0.064,
      maxImagesPerChunk: Number(process.env.NODEODM_MAX_IMAGES_PER_CHUNK) || 80,
      referenceAlt: Number(process.env.NODEODM_REFERENCE_ALT) || 20,
      referenceFootprint:
        Number(process.env.NODEODM_REFERENCE_FOOTPRINT) || 100,
      overlapRatio: Number(process.env.NODEODM_OVERLAP_RATIO) || 0.15,
      maxOverlapMeters: Number(process.env.NODEODM_MAX_OVERLAP_METERS) || 100,
    };
  }
}
