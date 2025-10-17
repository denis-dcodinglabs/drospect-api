import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import axios, { AxiosInstance, AxiosResponse } from "axios";
import * as FormData from "form-data";

export interface TaskInfo {
  uuid: string;
  dateCreated: number;
  processingTime: number;
  status: {
    code: number; // 20 = processing, 40 = completed
  };
  options: Array<{
    name: string;
    value: boolean;
  }>;
  imagesCount: number;
  progress: number;
}

export interface NodeOdmOptions {
  "orthophoto-png"?: boolean;
  "pc-ept"?: boolean;
  cog?: boolean;
  gltf?: boolean;
  split?: number;
  "split-overlap"?: number;
  webhook?: string;
}

@Injectable()
export class NodeOdmService {
  private readonly logger = new Logger(NodeOdmService.name);
  private readonly httpClient: AxiosInstance;
  private readonly nodeOdmBaseUrl: string;

  constructor() {
    this.nodeOdmBaseUrl =
      process.env.NODEODM_API_URL || "http://157.180.55.60:4000";

    this.httpClient = axios.create({
      baseURL: this.nodeOdmBaseUrl,
      timeout: 1800000, // 30 minutes timeout for large file uploads
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    // Add request/response interceptors for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        this.logger.debug(
          `Making request to ${config.method?.toUpperCase()} ${config.url}`,
        );
        return config;
      },
      (error) => {
        this.logger.error("Request error:", error);
        return Promise.reject(error);
      },
    );

    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug(
          `Response received: ${response.status} ${response.statusText}`,
        );
        return response;
      },
      (error) => {
        this.logger.error(
          `Response error: ${error.response?.status} ${error.response?.statusText}`,
        );
        return Promise.reject(error);
      },
    );
  }

  /**
   * Create a new NodeODM task using a remote ZIP URL (preferred flow)
   * @param zipUrl Publicly accessible ZIP URL containing images
   * @param options Processing options for NodeODM
   * @param customUuid Optional UUID to use for the task instead of letting NodeODM generate one
   * @returns Promise with task UUID
   */
  async createTaskFromZipUrl(
    zipUrl: string,
    options: NodeOdmOptions,
    customUuid?: string,
  ): Promise<{ uuid: string }> {
    try {
      this.logger.log(
        `Creating NodeODM task from zipurl: ${zipUrl}${
          customUuid ? ` using custom UUID: ${customUuid}` : ""
        }`,
      );

      const formData = new FormData();

      // Provide the remote ZIP URL for NodeODM to fetch
      formData.append("zipurl", zipUrl);

      // Add options to form data (excluding webhook as it's handled separately)
      const { webhook, ...processingOptions } = options || {};
      const optionsArray = Object.entries(processingOptions).map(
        ([name, value]) => ({
          name,
          value,
        }),
      );
      formData.append("options", JSON.stringify(optionsArray));

      // Add webhook if provided
      if (webhook) {
        formData.append("webhook", webhook);
      }

      // Prepare headers
      const headers: Record<string, any> = {
        ...formData.getHeaders(),
      };

      // Add custom UUID header if provided
      if (customUuid) {
        headers["set-uuid"] = customUuid;
      }

      const response: AxiosResponse<{ uuid: string }> =
        await this.httpClient.post("/task/new", formData, {
          headers,
        });

      this.logger.log(
        `NodeODM (zipurl) task created successfully with UUID: ${response.data.uuid}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error("Failed to create NodeODM task from zipurl:", error);
      throw new HttpException(
        `Failed to create NodeODM task from zipurl: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a new NodeODM task with thermal images (Legacy method - use streaming for large batches)
   * @param images Array of image files to process
   * @param options Processing options for NodeODM
   * @param customUuid Optional UUID to use for the task instead of letting NodeODM generate one
   * @returns Promise with task UUID
   */
  async createTask(
    images: any[],
    options: NodeOdmOptions,
    customUuid?: string,
  ): Promise<{ uuid: string }> {
    try {
      this.logger.log(
        `Creating NodeODM task with ${images.length} images${
          customUuid ? ` using custom UUID: ${customUuid}` : ""
        }`,
      );

      // For large batches, recommend using streaming upload
      if (images.length > 100) {
        this.logger.warn(
          `Large batch detected (${images.length} images). Consider using streaming upload for better performance.`,
        );
        return this.createTaskWithStreaming(images, options, customUuid);
      }

      const formData = new FormData();

      // Add images to form data
      images.forEach((image) => {
        formData.append("images", image.buffer, {
          filename: image.originalname,
          contentType: image.mimetype,
        });
      });

      // Add options to form data (excluding webhook as it's handled separately)
      const { webhook, ...processingOptions } = options;
      const optionsArray = Object.entries(processingOptions).map(
        ([name, value]) => ({
          name,
          value,
        }),
      );

      formData.append("options", JSON.stringify(optionsArray));

      // Add webhook if provided
      if (webhook) {
        formData.append("webhook", webhook);
      }

      // Prepare headers
      const headers = {
        ...formData.getHeaders(),
      };

      // Add custom UUID header if provided
      if (customUuid) {
        headers["set-uuid"] = customUuid;
      }

      const response: AxiosResponse<{ uuid: string }> =
        await this.httpClient.post("/task/new", formData, {
          headers,
        });

      this.logger.log(
        `NodeODM task created successfully with UUID: ${response.data.uuid}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error("Failed to create NodeODM task:", error);
      throw new HttpException(
        `Failed to create NodeODM task: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a new NodeODM task using streaming upload (Recommended for large batches)
   * @param images Array of image files or URLs to process
   * @param options Processing options for NodeODM
   * @param customUuid Optional UUID to use for the task
   * @param progressCallback Optional callback for upload progress
   * @returns Promise with task UUID
   */
  async createTaskWithStreaming(
    images: any[],
    options: NodeOdmOptions,
    customUuid?: string,
    progressCallback?: (progress: any) => void,
  ): Promise<{ uuid: string }> {
    try {
      this.logger.log(
        `Creating NodeODM task with streaming upload for ${
          images.length
        } images${customUuid ? ` using custom UUID: ${customUuid}` : ""}`,
      );

      // Import streaming service dynamically to avoid circular dependencies
      const { StreamingUploadService } = await import(
        "./streaming-upload.service"
      );
      const streamingService = new StreamingUploadService();

      return await streamingService.streamUploadToNodeOdm(
        images,
        options,
        customUuid,
        progressCallback,
      );
    } catch (error) {
      this.logger.error("Failed to create NodeODM task with streaming:", error);
      throw new HttpException(
        `Failed to create NodeODM task with streaming: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get task information and progress
   * @param uuid Task UUID from NodeODM
   * @returns Promise with task information
   */
  async getTaskInfo(uuid: string): Promise<TaskInfo> {
    try {
      this.logger.debug(`Getting task info for UUID: ${uuid}`);

      const response: AxiosResponse<TaskInfo> = await this.httpClient.get(
        `/task/${uuid}/info`,
      );

      const data = response?.data as any;

      // Some NodeODM builds may return 200 with a payload missing status/progress
      // before the task is fully registered. Guard against undefined fields.
      const statusCode = Number(data?.status?.code);
      const safeData: TaskInfo = {
        uuid: data?.uuid || uuid,
        dateCreated: data?.dateCreated || Date.now(),
        processingTime: data?.processingTime || 0,
        status: {
          code: Number.isFinite(statusCode) ? statusCode : 10, // default to queued
        },
        options: Array.isArray(data?.options) ? data.options : [],
        imagesCount: Number.isFinite(data?.imagesCount) ? data.imagesCount : 0,
        progress: Number.isFinite(data?.progress) ? data.progress : 0,
      };

      this.logger.debug(
        `Task ${uuid} status: ${safeData.status.code}, progress: ${safeData.progress}%`,
      );
      return safeData;
    } catch (error) {
      this.logger.error(`Failed to get task info for ${uuid}:`, error);
      throw new HttpException(
        `Failed to get task info: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Download the result ZIP file from completed task
   * @param uuid Task UUID from NodeODM
   * @returns Promise with ZIP file buffer
   */
  async downloadTaskResult(uuid: string): Promise<Buffer> {
    try {
      this.logger.log(`Downloading result for task UUID: ${uuid}`);

      const response: AxiosResponse<Buffer> = await this.httpClient.get(
        `/task/${uuid}/download/all.zip`,
        {
          responseType: "arraybuffer",
          timeout: 1800000, // 30 minutes timeout for large downloads
        },
      );

      this.logger.log(
        `Successfully downloaded result for task ${uuid}, size: ${response.data.length} bytes`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to download result for ${uuid}:`, error);
      throw new HttpException(
        `Failed to download task result: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check if a task is completed
   * @param uuid Task UUID from NodeODM
   * @returns Promise with completion status
   */
  async isTaskCompleted(uuid: string): Promise<boolean> {
    try {
      const taskInfo = await this.getTaskInfo(uuid);
      return taskInfo.status.code === 40; // 40 means completed
    } catch (error) {
      this.logger.error(`Failed to check task completion for ${uuid}:`, error);
      return false;
    }
  }

  /**
   * Check if a task has failed
   * @param uuid Task UUID from NodeODM
   * @returns Promise with failure status
   */
  async isTaskFailed(uuid: string): Promise<boolean> {
    try {
      const taskInfo = await this.getTaskInfo(uuid);
      // Add additional checks for failure conditions if needed
      return (
        taskInfo.status.code === 30 ||
        taskInfo.status.code === 50 ||
        taskInfo.status.code < 0 // Negative codes typically indicate errors
      );
    } catch (error) {
      this.logger.error(`Failed to check task failure for ${uuid}:`, error);
      return true; // Assume failed if we can't get status
    }
  }

  /**
   * Cancel a running task
   * @param uuid Task UUID from NodeODM
   * @returns Promise with cancellation result
   */
  async cancelTask(uuid: string): Promise<boolean> {
    try {
      this.logger.log(`Cancelling task ${uuid}`);

      await this.httpClient.post("/task/cancel", {
        uuid: uuid,
      });

      this.logger.log(`Task ${uuid} cancelled successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to cancel task ${uuid}:`, error);
      return false;
    }
  }
}
