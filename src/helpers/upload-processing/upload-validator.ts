import { Multer } from "multer";
import {
  SUPPORTED_MIME_TYPES,
  UPLOAD_CONFIG,
  ERROR_MESSAGES,
} from "./upload-constants";
import { UploadValidationResult } from "./upload-interfaces";
import { AppLogger } from "../../common/logger/logger.service";

export class UploadValidator {
  private logger = new AppLogger();

  /**
   * Validate upload files
   */
  validateFiles(files: Multer.File[]): UploadValidationResult {
    const errors: string[] = [];

    if (!files || files.length === 0) {
      errors.push("No files provided for upload");
      return { isValid: false, errors };
    }

    // Check total number of files
    if (files.length > UPLOAD_CONFIG.maxFilesPerUpload) {
      errors.push(
        `${ERROR_MESSAGES.TOO_MANY_FILES} (${files.length}/${UPLOAD_CONFIG.maxFilesPerUpload})`,
      );
    }

    // Check total upload size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > UPLOAD_CONFIG.maxTotalUploadSize) {
      errors.push(
        `${ERROR_MESSAGES.TOTAL_SIZE_TOO_LARGE} (${Math.round(
          totalSize / 1024 / 1024,
        )}MB/${Math.round(UPLOAD_CONFIG.maxTotalUploadSize / 1024 / 1024)}MB)`,
      );
    }

    for (const file of files) {
      // Check file type
      if (!SUPPORTED_MIME_TYPES.includes(file.mimetype)) {
        errors.push(
          `${file.originalname}: ${ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE}`,
        );
      }

      // Check file size
      if (file.size > UPLOAD_CONFIG.maxFileSize) {
        errors.push(
          `${file.originalname}: ${ERROR_MESSAGES.FILE_TOO_LARGE} (${Math.round(
            file.size / 1024 / 1024,
          )}MB/50MB)`,
        );
      }

      // Check if file has buffer
      if (!file.buffer || file.buffer.length === 0) {
        errors.push(`${file.originalname}: File buffer is empty`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate project ID
   */
  validateProjectId(projectId: number): UploadValidationResult {
    const errors: string[] = [];

    if (!projectId || isNaN(projectId) || projectId <= 0) {
      errors.push("Invalid project ID provided");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate bucket name
   */
  validateBucketName(bucketName: string): UploadValidationResult {
    const errors: string[] = [];

    if (
      !bucketName ||
      typeof bucketName !== "string" ||
      bucketName.trim() === ""
    ) {
      errors.push("Invalid bucket name provided");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Comprehensive validation for upload
   */
  validateUpload(
    files: Multer.File[],
    projectId: number,
    bucketName: string,
  ): UploadValidationResult {
    const fileValidation = this.validateFiles(files);
    const projectValidation = this.validateProjectId(projectId);
    const bucketValidation = this.validateBucketName(bucketName);

    const allErrors = [
      ...fileValidation.errors,
      ...projectValidation.errors,
      ...bucketValidation.errors,
    ];

    const isValid =
      fileValidation.isValid &&
      projectValidation.isValid &&
      bucketValidation.isValid;

    if (!isValid) {
      this.logger.warn("Upload validation failed:", allErrors);
    }

    return {
      isValid,
      errors: allErrors,
    };
  }
}
