export const SUPPORTED_MIME_TYPES = ["image/jpeg", "image/png"] as const;

export const UPLOAD_CONFIG = {
  maxFileSize: 50 * 1024 * 1024, // 50MB per file
  batchSize: 5, // Reduced for e2-small memory constraints
  retryAttempts: 3,
  maxFilesPerUpload: 100, // Maximum number of files per upload
  maxTotalUploadSize: 500 * 1024 * 1024, // 500MB total per upload batch
} as const;

export const GCS_CONFIG = {
  resumable: false,
  gzip: false,
  metadata: {
    contentType: "image/jpeg",
    cacheControl: "no-cache", // Ensure the updated image is fetched
  },
} as const;

export const GCS_CONFIG_ZIP = {
  resumable: true,
  gzip: true,
  metadata: {
    contentType: "application/zip",
    cacheControl: "no-store",
  },
} as const;

export const PROCESSING_CONFIG = {
  maxConcurrentUploads: 8, // Reduced for e2-small CPU constraints
  maxConcurrentMetadataExtraction: 5, // Reduced for e2-small CPU constraints
  timeoutMs: 30000, // 30 seconds timeout for uploads
  metadataTimeoutMs: 10000, // 10 seconds timeout for metadata extraction
} as const;

export const ERROR_MESSAGES = {
  UNSUPPORTED_FILE_TYPE:
    "Unsupported file type. Only JPEG and PNG images are supported.",
  FILE_TOO_LARGE: "File size exceeds maximum allowed size (50MB per file).",
  TOO_MANY_FILES: "Too many files. Maximum 100 files per upload.",
  TOTAL_SIZE_TOO_LARGE:
    "Total upload size too large. Maximum 500MB per upload.",
  PROJECT_NOT_FOUND: "Project not found.",
  UPLOAD_FAILED: "Failed to upload file to Google Cloud Storage.",
  METADATA_EXTRACTION_FAILED: "Failed to extract metadata from image.",
  UPLOAD_TIMEOUT: "Upload timed out. Please try again.",
  METADATA_TIMEOUT: "Metadata extraction timed out.",
} as const;

export const SUCCESS_MESSAGES = {
  UPLOAD_SUCCESS: "Files uploaded successfully.",
  METADATA_EXTRACTED: "Metadata extracted successfully.",
  PROCESSING_COMPLETE: "Processing completed successfully.",
} as const;

export const LOG_MESSAGES = {
  STARTING_UPLOAD: "Starting file upload process",
  PROCESSING_FILE: "Processing file",
  UPLOAD_COMPLETE: "Upload process completed",
  METADATA_EXTRACTION_START: "Starting metadata extraction",
  METADATA_EXTRACTION_COMPLETE: "Metadata extraction completed",
  BATCH_PROCESSING_START: "Starting batch processing",
  BATCH_PROCESSING_COMPLETE: "Batch processing completed",
} as const;
