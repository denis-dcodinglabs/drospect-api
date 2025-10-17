import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom, catchError } from "rxjs";
import { AxiosResponse } from "axios";

export interface TileJsonResponse {
  tilejson: string;
  name: string;
  version: string;
  scheme: string;
  tiles: string[];
  minzoom: number;
  maxzoom: number;
  bounds: number[];
}

export interface BoundsResponse {
  url: string;
  bounds: number[];
}

export interface MetadataResponse {
  bounds: number[];
  minzoom: number;
  maxzoom: number;
  name: string;
  dtype: string;
  colorinterp: string[];
  nodata?: number;
  statistics: Record<string, any>;
}

@Injectable()
export class TilesProxyService {
  private readonly logger = new Logger(TilesProxyService.name);
  private readonly tilingServerUrl: string;
  private readonly backendBaseUrl: string | undefined;

  constructor(private readonly httpService: HttpService) {
    // Get tiling server URL from environment or use default
    this.tilingServerUrl = process.env.TILING_SERVER_URL || "localhost:8000";

    this.logger.log(`Tiling server URL: ${this.tilingServerUrl}`);

    // Backend base URL to be forwarded to tiling server
    this.backendBaseUrl = process.env.BACKEND_BASE_URL;
    if (!this.backendBaseUrl) {
      this.logger.warn(
        "BACKEND_BASE_URL is not set; requests to tiling server will not include backend_base_url param",
      );
    } else {
      this.logger.log(`Using BACKEND_BASE_URL: ${this.backendBaseUrl}`);
    }
  }

  /**
   * Get TileJSON metadata from Python tiling server
   * @param taskId Task ID
   * @param queryParams Optional query parameters
   * @returns TileJSON response
   */
  async getTileJson(
    taskId: string,
    queryParams: Record<string, any> | undefined,
  ): Promise<TileJsonResponse> {
    try {
      const url = `${this.tilingServerUrl}/api/tiles/${taskId}/tilejson`;
      const params = {
        ...(queryParams || {}),
        ...(this.backendBaseUrl
          ? { backend_base_url: this.backendBaseUrl }
          : {}),
      } as Record<string, any>;

      this.logger.debug(`Fetching TileJSON for task ${taskId} from ${url}`);

      const response = await firstValueFrom(
        this.httpService
          .get<TileJsonResponse>(url, {
            params,
            timeout: 300000,
          })
          .pipe(
            catchError((error) => {
              this.logger.error(
                `Failed to fetch TileJSON for task ${taskId}:`,
                error.message,
              );
              throw new HttpException(
                `Failed to fetch TileJSON: ${
                  error.response?.data?.detail || error.message
                }`,
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
              );
            }),
          ),
      );

      // Replace tiling server URLs with backend URLs in tiles array
      const tileJson = response.data;

      this.logger.debug(
        `Original tiles from Python server: ${JSON.stringify(tileJson.tiles)}`,
      );
      this.logger.debug(`Tiling server URL: ${this.tilingServerUrl}`);

      tileJson.tiles = tileJson.tiles.map((tileUrl) => {
        this.logger.debug(`Processing tile URL: ${tileUrl}`);

        let replaced = tileUrl;

        // Handle full tiling server URLs
        if (tileUrl.startsWith(`${this.tilingServerUrl}/api/tiles`)) {
          replaced = tileUrl.replace(
            `${this.tilingServerUrl}/api/tiles`,
            "api/tiles",
          );
        }
        // Handle relative URLs that start with /api/tiles
        else if (tileUrl.startsWith("/api/tiles")) {
          replaced = tileUrl.replace("/api/tiles", "api/tiles");
        }

        this.logger.debug(`Replaced tile URL: ${replaced}`);
        return replaced;
      });

      this.logger.debug(`Final tiles array: ${JSON.stringify(tileJson.tiles)}`);

      return tileJson;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Unexpected error fetching TileJSON for task ${taskId}:`,
        error,
      );
      throw new HttpException(
        "Failed to fetch TileJSON",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get bounds from Python tiling server
   * @param taskId Task ID
   * @param queryParams Optional query parameters
   * @returns Bounds response
   */
  async getBounds(
    taskId: string,
    queryParams: Record<string, any> | undefined,
  ): Promise<BoundsResponse> {
    try {
      const url = `${this.tilingServerUrl}/api/tiles/${taskId}/bounds`;
      const params = {
        ...(queryParams || {}),
        ...(this.backendBaseUrl
          ? { backend_base_url: this.backendBaseUrl }
          : {}),
      } as Record<string, any>;

      this.logger.debug(`Fetching bounds for task ${taskId} from ${url}`);

      const response = await firstValueFrom(
        this.httpService
          .get<BoundsResponse>(url, {
            params,
            timeout: 300000,
          })
          .pipe(
            catchError((error) => {
              this.logger.error(
                `Failed to fetch bounds for task ${taskId}:`,
                error.message,
              );
              throw new HttpException(
                `Failed to fetch bounds: ${
                  error.response?.data?.detail || error.message
                }`,
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
              );
            }),
          ),
      );

      // Replace tiling server URL with backend URL
      const bounds = response.data;

      this.logger.debug(`Original bounds URL: ${bounds.url}`);

      let replaced = bounds.url;

      // Handle full tiling server URLs
      if (bounds.url.startsWith(`${this.tilingServerUrl}/api/tiles`)) {
        replaced = bounds.url.replace(
          `${this.tilingServerUrl}/api/tiles`,
          "api/tiles",
        );
      }
      // Handle relative URLs that start with /api/tiles
      else if (bounds.url.startsWith("/api/tiles")) {
        replaced = bounds.url.replace("/api/tiles", "api/tiles");
      }

      bounds.url = replaced;
      this.logger.debug(`Replaced bounds URL: ${bounds.url}`);

      return bounds;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Unexpected error fetching bounds for task ${taskId}:`,
        error,
      );
      throw new HttpException(
        "Failed to fetch bounds",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get metadata from Python tiling server
   * @param taskId Task ID
   * @param queryParams Optional query parameters
   * @returns Metadata response
   */
  async getMetadata(
    taskId: string,
    queryParams: Record<string, any> | undefined,
  ): Promise<MetadataResponse> {
    try {
      const url = `${this.tilingServerUrl}/api/tiles/${taskId}/metadata`;
      const params = {
        ...(queryParams || {}),
        ...(this.backendBaseUrl
          ? { backend_base_url: this.backendBaseUrl }
          : {}),
      } as Record<string, any>;

      this.logger.debug(`Fetching metadata for task ${taskId} from ${url}`);

      const response = await firstValueFrom(
        this.httpService
          .get<MetadataResponse>(url, {
            params,
            timeout: 300000,
          })
          .pipe(
            catchError((error) => {
              this.logger.error(
                `Failed to fetch metadata for task ${taskId}:`,
                error.message,
              );
              throw new HttpException(
                `Failed to fetch metadata: ${
                  error.response?.data?.detail || error.message
                }`,
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
              );
            }),
          ),
      );

      return response.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Unexpected error fetching metadata for task ${taskId}:`,
        error,
      );
      throw new HttpException(
        "Failed to fetch metadata",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get tile image from Python tiling server
   * @param taskId Task ID
   * @param z Zoom level
   * @param x Tile X coordinate
   * @param y Tile Y coordinate
   * @param format Image format
   * @param queryParams Optional query parameters
   * @returns Tile image response
   */
  async getTile(
    taskId: string,
    z: number,
    x: number,
    y: number,
    format: string = "png",
    queryParams: Record<string, any> | undefined,
  ): Promise<AxiosResponse<Buffer>> {
    try {
      const url = `${this.tilingServerUrl}/api/tiles/${taskId}/${z}/${x}/${y}.${format}`;
      const params = {
        ...(queryParams || {}),
        ...(this.backendBaseUrl
          ? { backend_base_url: this.backendBaseUrl }
          : {}),
      } as Record<string, any>;

      this.logger.debug(
        `Fetching tile for task ${taskId} at ${z}/${x}/${y}.${format}`,
      );

      const response = await firstValueFrom(
        this.httpService
          .get<Buffer>(url, {
            params,
            timeout: 300000,
            responseType: "arraybuffer",
            headers: {
              Accept: `image/${format}`,
            },
          })
          .pipe(
            catchError((error) => {
              this.logger.error(
                `Failed to fetch tile for task ${taskId} at ${z}/${x}/${y}.${format}:`,
                error.message,
              );
              throw new HttpException(
                `Failed to fetch tile: ${
                  error.response?.data?.detail || error.message
                }`,
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
              );
            }),
          ),
      );

      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Unexpected error fetching tile for task ${taskId} at ${z}/${x}/${y}.${format}:`,
        error,
      );
      throw new HttpException(
        "Failed to fetch tile",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check if tiling server is healthy
   * @returns Health status
   */
  async checkHealth(): Promise<{ status: string; service: string }> {
    try {
      const url = `${this.tilingServerUrl}/health`;

      const response = await firstValueFrom(
        this.httpService.get(url, { timeout: 60000 }).pipe(
          catchError((error) => {
            this.logger.error(
              "Tiling server health check failed:",
              error.message,
            );
            throw new HttpException(
              "Tiling server is not available",
              HttpStatus.SERVICE_UNAVAILABLE,
            );
          }),
        ),
      );

      return response.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        "Unexpected error during tiling server health check:",
        error,
      );
      throw new HttpException(
        "Tiling server health check failed",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
