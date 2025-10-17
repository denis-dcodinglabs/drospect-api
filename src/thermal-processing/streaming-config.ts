export interface StreamingConfig {
  // Batch processing settings
  batchSize: number;
  maxConcurrentBatches: number;

  // Retry settings
  retryAttempts: number;
  retryDelay: number;

  // Timeout settings
  uploadTimeout: number;
  imageDownloadTimeout: number;

  // Memory management
  maxMemoryUsage: number; // MB
  enableMemoryMonitoring: boolean;

  // Network settings
  maxConcurrentDownloads: number;
  connectionTimeout: number;
}

export const getStreamingConfig = (): StreamingConfig => ({
  // Batch processing settings
  batchSize: Number(process.env.STREAMING_BATCH_SIZE) || 50,
  maxConcurrentBatches:
    Number(process.env.STREAMING_MAX_CONCURRENT_BATCHES) || 2,

  // Retry settings
  retryAttempts: Number(process.env.STREAMING_RETRY_ATTEMPTS) || 3,
  retryDelay: Number(process.env.STREAMING_RETRY_DELAY) || 5000,

  // Timeout settings
  uploadTimeout: Number(process.env.STREAMING_UPLOAD_TIMEOUT) || 1800000, // 30 minutes
  imageDownloadTimeout:
    Number(process.env.STREAMING_IMAGE_DOWNLOAD_TIMEOUT) || 30000, // 30 seconds

  // Memory management
  maxMemoryUsage: Number(process.env.STREAMING_MAX_MEMORY_USAGE) || 2048, // 2GB
  enableMemoryMonitoring:
    process.env.STREAMING_ENABLE_MEMORY_MONITORING === "true",

  // Network settings
  maxConcurrentDownloads:
    Number(process.env.STREAMING_MAX_CONCURRENT_DOWNLOADS) || 10,
  connectionTimeout: Number(process.env.STREAMING_CONNECTION_TIMEOUT) || 60000, // 1 minute
});

export const STREAMING_CONFIG = getStreamingConfig();
