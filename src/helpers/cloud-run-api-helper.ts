import { Injectable, Logger } from "@nestjs/common";
import * as https from "https";

interface ApiCallData {
  projectId: number;
  limit: number;
  altitude: string;
  imagesData: Array<{
    imageId: number;
    imageUrl: string;
    imageName: string;
  }>;
}

interface ApiResponse {
  status: number;
  data: any;
}

@Injectable()
export class CloudRunApiService {
  private readonly logger = new Logger(CloudRunApiService.name);
  private readonly API_URL =
    "https://image-inspect-service-dev-489128681655.us-central1.run.app/inspect/process-images";
  private readonly DEFAULT_TIMEOUT_MS = 180000; // 3 minutes

  async callImageInspectAPI(
    data: ApiCallData,
    timeoutMs: number = this.DEFAULT_TIMEOUT_MS,
  ): Promise<ApiResponse> {
    this.logger.log("🔍 Starting Cloud Run API call");
    this.logger.log(`URL: ${this.API_URL}`);
    this.logger.log(
      `Payload: ${JSON.stringify({
        projectId: data.projectId,
        limit: data.limit,
        altitude: data.altitude,
        imagesCount: data.imagesData?.length || 0,
      })}`,
    );
    this.logger.log(`Timeout: ${timeoutMs / 1000} seconds`);
    this.logger.log(`Node.js Version: ${process.version}`);

    const startTime = performance.now();

    try {
      this.logger.log("⏱️ Starting API call...");

      // Use fetch if available (Node 18+), otherwise use https module
      if (typeof fetch !== "undefined") {
        this.logger.log("📡 Using native fetch API");
        return await this.callWithFetch(data, timeoutMs, startTime);
      } else {
        this.logger.log("📡 Using https module (Node < 18)");
        return await this.callWithHttps(data, timeoutMs, startTime);
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error("❌ API call failed");
      this.logger.error(`⏱️ Duration: ${(duration / 1000).toFixed(2)} seconds`);
      this.logger.error(`Error: ${error.message}`);
      this.logger.error(`Error Type: ${error.name}`);

      if (error.code) {
        this.logger.error(`Error Code: ${error.code}`);
      }

      // Throw in the same format as the original helper
      throw {
        response: {
          message: `Cloud Run API call failed: ${error.message}`,
          error: {
            type: error.name || "UnknownError",
            originalError: error.message,
            code: error.code,
            duration: (duration / 1000).toFixed(2) + "s",
          },
        },
        status: this.getStatusFromError(error),
      };
    }
  }

  private async callWithFetch(
    data: ApiCallData,
    timeoutMs: number,
    startTime: number,
  ): Promise<ApiResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      this.logger.log("⏰ Request timeout reached, aborting...");
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(this.API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": `Node.js/${process.version} NestJS-Service`,
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = performance.now() - startTime;

      this.logger.log("✅ Response received");
      this.logger.log(`⏱️ Duration: ${(duration / 1000).toFixed(2)} seconds`);
      this.logger.log(`📊 Status: ${response.status} ${response.statusText}`);

      // Log response headers for debugging
      const headers: Record<string, string> = {};
      for (const [key, value] of response.headers.entries()) {
        headers[key] = value;
      }
      this.logger.log("📋 Response Headers:", headers);

      // Read response body
      const responseText = await response.text();
      let responseData: any;

      try {
        responseData = JSON.parse(responseText);
        this.logger.log("📄 Successfully parsed JSON response");
      } catch (parseError) {
        this.logger.error(
          "⚠️ Could not parse response as JSON:",
          parseError.message,
        );
        this.logger.log("📄 Raw response:", responseText.substring(0, 500));
        throw new Error(`Failed to parse API response: ${parseError.message}`);
      }

      if (response.ok) {
        this.logger.log("🎉 API call successful!");
        return {
          status: response.status,
          data: responseData,
        };
      } else {
        this.logger.log("⚠️ API returned error status");
        throw new Error(
          `API returned error status ${response.status}: ${JSON.stringify(
            responseData,
          )}`,
        );
      }
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private callWithHttps(
    data: ApiCallData,
    timeoutMs: number,
    startTime: number,
  ): Promise<ApiResponse> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(data);

      const options = {
        hostname: "image-inspect-service-489128681655.europe-west4.run.app",
        port: 443,
        path: "/inspect/process-images",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
          "User-Agent": `Node.js/${process.version} NestJS-Service`,
        },
      };

      const req = https.request(options, (res) => {
        const duration = performance.now() - startTime;

        this.logger.log("✅ Response received");
        this.logger.log(`⏱️ Duration: ${(duration / 1000).toFixed(2)} seconds`);
        this.logger.log(`📊 Status: ${res.statusCode} ${res.statusMessage}`);
        this.logger.log("📋 Response Headers:", res.headers);

        let responseBody = "";
        res.on("data", (chunk) => {
          responseBody += chunk;
        });

        res.on("end", () => {
          try {
            const responseData = JSON.parse(responseBody);
            this.logger.log("📄 Successfully parsed JSON response");

            if (res.statusCode >= 200 && res.statusCode < 300) {
              this.logger.log("🎉 API call successful!");
              resolve({
                status: res.statusCode,
                data: responseData,
              });
            } else {
              this.logger.log("⚠️ API returned error status");
              reject(
                new Error(
                  `API returned error status ${
                    res.statusCode
                  }: ${JSON.stringify(responseData)}`,
                ),
              );
            }
          } catch (parseError) {
            this.logger.error(
              "⚠️ Could not parse response as JSON:",
              parseError.message,
            );
            this.logger.log("📄 Raw response:", responseBody.substring(0, 500));
            reject(
              new Error(`Failed to parse API response: ${parseError.message}`),
            );
          }
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new Error(`Request timeout after ${timeoutMs / 1000} seconds`));
      });

      req.setTimeout(timeoutMs);
      req.write(postData);
      req.end();
    });
  }

  private getStatusFromError(error: any): number {
    if (error.name === "AbortError") {
      return 408; // Request Timeout
    }
    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return 503; // Service Unavailable
    }
    if (error.code === "ETIMEDOUT") {
      return 408; // Request Timeout
    }
    return 500; // Internal Server Error
  }
}
