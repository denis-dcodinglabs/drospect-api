import imageCompression from "browser-image-compression";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  initialQuality: 0.8,
  quality: 0.8,
  preserveExif: true, // Preserve EXIF metadata (GPS, camera settings, etc.)
};

/**
 * Compresses an image file if it's larger than 1MB while preserving metadata
 * @param {File} file - The image file to potentially compress
 * @returns {Promise<File>} - The original file if under 1MB, compressed file if over 1MB
 */
export const compressImageIfNeeded = async (file) => {
  // Check if file is larger than 1MB (1048576 bytes)
  const oneMB = 2097152;

  if (file.size <= oneMB) {
    // File is already under 1MB, return as is
    return file;
  }

  try {
    console.log(
      `Compressing image ${file.name} (${(file.size / 1048576).toFixed(2)}MB)`,
    );

    const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);

    // Create a new File object with the original name and compressed data
    const resultFile = new File([compressedFile], file.name, {
      type: compressedFile.type || file.type,
      lastModified: Date.now(),
    });

    console.log(
      `Compressed ${file.name} from ${(file.size / 1048576).toFixed(2)}MB to ${(
        resultFile.size / 1048576
      ).toFixed(2)}MB`,
    );

    return resultFile;
  } catch (error) {
    console.error(`Error compressing image ${file.name}:`, error);
    // If compression fails, return the original file
    return file;
  }
};

/**
 * Compresses multiple images if they're larger than 1MB while preserving metadata
 * @param {File[]} files - Array of image files to potentially compress
 * @param {Function} onProgress - Optional callback for progress updates
 * @returns {Promise<File[]>} - Array of processed files
 */
export const compressMultipleImagesIfNeeded = async (files, onProgress) => {
  const processedFiles = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const processedFile = await compressImageIfNeeded(file);
    processedFiles.push(processedFile);

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: files.length,
        fileName: file.name,
        originalSize: file.size,
        processedSize: processedFile.size,
      });
    }
  }

  return processedFiles;
};
