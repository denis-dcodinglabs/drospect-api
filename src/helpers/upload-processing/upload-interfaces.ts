// These imports are used in the interfaces for type definitions

export interface UploadOptions {
  drone?: boolean;
  batchSize?: number;
  retryAttempts?: number;
}

export interface UploadResult {
  totalFiles: number;
  successfulUploads: number;
  failedUploads: number;
  errors: UploadError[];
  processingTime?: number;
  memoryUsage?: string;
}

export interface UploadError {
  filename: string;
  error: string;
  code?: string;
}

export interface ImageMetadata {
  latitude: number | null;
  longitude: number | null;
  isRGB: boolean;
  filename: string;
  publicUrl: string;
}

export interface GPSData {
  latitude: number | null;
  longitude: number | null;
}

export interface MetadataExtractionResult {
  gps: GPSData;
  isRGB: boolean;
}

export interface ProcessedImageData {
  metadata: ImageMetadata;
  buffer: Buffer;
  originalName: string;
}

export interface DroneMetadata {
  imageDescription?: string;
  make?: string;
  model?: string;
}

export interface UploadValidationResult {
  isValid: boolean;
  errors: string[];
}
