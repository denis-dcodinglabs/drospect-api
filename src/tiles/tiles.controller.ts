import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  HttpStatus,
  UseGuards,
  Logger,
  ParseIntPipe,
  Req,
} from "@nestjs/common";
import { Response, Request } from "express";
import { TilesService } from "./tiles.service";
import { JwtOrApiKeyAuthGuard } from "../authentication/jwt-or-apikey-auth.guard";
import { getSubIdFromToken } from "../decodedToken/getSubIdFromToken";

@Controller("tiles")
export class TilesController {
  private readonly logger = new Logger(TilesController.name);

  constructor(private readonly tilesService: TilesService) {}

  /**
   * Get TileJSON metadata for a task
   * @param taskId Task ID
   * @param query Query parameters
   * @param req Request object
   * @returns TileJSON response
   */
  @Get(":taskId/tilejson")
  @UseGuards(JwtOrApiKeyAuthGuard)
  async getTileJson(
    @Param("taskId") taskId: string,
    @Query() query: Record<string, any>,
    @Req() req: Request,
  ) {
    this.logger.debug(`TileJSON request for task ${taskId}`);

    const authorizationHeader = req.headers["authorization"];
    const userId = getSubIdFromToken(authorizationHeader);

    return this.tilesService.getTileJson(taskId, userId, query);
  }

  /**
   * Get bounds for a task
   * @param taskId Task ID
   * @param query Query parameters
   * @param req Request object
   * @returns Bounds response
   */
  @Get(":taskId/bounds")
  @UseGuards(JwtOrApiKeyAuthGuard)
  async getBounds(
    @Param("taskId") taskId: string,
    @Query() query: Record<string, any>,
    @Req() req: Request,
  ) {
    this.logger.debug(`Bounds request for task ${taskId}`);

    const authorizationHeader = req.headers["authorization"];
    const userId = getSubIdFromToken(authorizationHeader);

    return this.tilesService.getBounds(taskId, userId, query);
  }

  /**
   * Get metadata for a task
   * @param taskId Task ID
   * @param query Query parameters
   * @param req Request object
   * @returns Metadata response
   */
  @Get(":taskId/metadata")
  @UseGuards(JwtOrApiKeyAuthGuard)
  async getMetadata(
    @Param("taskId") taskId: string,
    @Query() query: Record<string, any>,
    @Req() req: Request,
  ) {
    this.logger.debug(`Metadata request for task ${taskId}`);

    const authorizationHeader = req.headers["authorization"];
    const userId = getSubIdFromToken(authorizationHeader);

    return this.tilesService.getMetadata(taskId, userId, query);
  }

  /**
   * Get tile image
   * @param taskId Task ID
   * @param z Zoom level
   * @param x Tile X coordinate
   * @param y Tile Y coordinate
   * @param format Image format (optional, defaults to png)
   * @param query Query parameters
   * @param req Request object
   * @param res Express response object
   */
  @Get(":taskId/:z/:x/:y.:format")
  async getTileWithFormat(
    @Param("taskId") taskId: string,
    @Param("z", ParseIntPipe) z: number,
    @Param("x", ParseIntPipe) x: number,
    @Param("y", ParseIntPipe) y: number,
    @Param("format") format: string,
    @Query() query: Record<string, any>,
    @Req() req: Request,
    @Res() res?: Response,
  ) {
    return this.serveTile(taskId, z, x, y, format, query, req, res);
  }

  /**
   * Get tile image without format (defaults to png)
   * @param taskId Task ID
   * @param z Zoom level
   * @param x Tile X coordinate
   * @param y Tile Y coordinate
   * @param query Query parameters
   * @param req Request object
   * @param res Express response object
   */
  @Get(":taskId/:z/:x/:y")
  async getTile(
    @Param("taskId") taskId: string,
    @Param("z", ParseIntPipe) z: number,
    @Param("x", ParseIntPipe) x: number,
    @Param("y", ParseIntPipe) y: number,
    @Query() query: Record<string, any>,
    @Req() req: Request,
    @Res() res?: Response,
  ) {
    return this.serveTile(taskId, z, x, y, "png", query, req, res);
  }

  /**
   * Common method to serve tiles
   * @param taskId Task ID
   * @param z Zoom level
   * @param x Tile X coordinate
   * @param y Tile Y coordinate
   * @param format Image format
   * @param query Query parameters
   * @param req Request object
   * @param res Express response object
   */
  private async serveTile(
    taskId: string,
    z: number,
    x: number,
    y: number,
    format: string,
    query: Record<string, any>,
    req: Request,
    res?: Response,
  ) {
    this.logger.debug(
      `Tile request for task ${taskId} at ${z}/${x}/${y}.${format}`,
    );

    try {
      const authorizationHeader = req.headers["authorization"];
      const userId = getSubIdFromToken(authorizationHeader);
      const tileResponse = await this.tilesService.getTile(
        taskId,
        z,
        x,
        y,
        format,
        userId,
        query,
      );

      // Determine content type based on format
      let contentType = "image/png";
      switch (format.toLowerCase()) {
        case "jpg":
        case "jpeg":
          contentType = "image/jpeg";
          break;
        case "webp":
          contentType = "image/webp";
          break;
        case "tif":
        case "tiff":
          contentType = "image/tiff";
          break;
        default:
          contentType = "image/png";
      }

      // Set response headers
      res.set({
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "Access-Control-Allow-Origin": "*",
        "Content-Length": tileResponse.data.length.toString(),
      });

      res.status(HttpStatus.OK).send(tileResponse.data);
    } catch (error) {
      this.logger.error(
        `Error serving tile ${taskId}/${z}/${x}/${y}.${format}:`,
        error.message,
      );
      res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || "Failed to serve tile",
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  /**
   * Get task information for tile access
   * @param taskId Task ID
   * @returns Task information
   */
  @Get(":taskId/info")
  async getTaskInfo(@Param("taskId") taskId: string) {
    this.logger.debug(`Task info request for task ${taskId}`);

    return this.tilesService.getTaskInfo(taskId);
  }

  /**
   * List accessible tasks for the current user
   * @param projectId Optional project ID filter
   * @param req Request object
   * @returns List of accessible tasks
   */
  @Get()
  @UseGuards(JwtOrApiKeyAuthGuard)
  async getAccessibleTasks(
    @Query("projectId", new ParseIntPipe({ optional: true }))
    projectId?: number,
    @Req() req?: Request,
  ) {
    const authorizationHeader = req.headers["authorization"];
    const userId = getSubIdFromToken(authorizationHeader);

    this.logger.debug(
      `Accessible tasks request for user ${userId}, project ${projectId}`,
    );

    if (!userId) {
      throw new Error("User ID is required");
    }

    return this.tilesService.getAccessibleTasks(userId, projectId);
  }

  /**
   * Health check endpoint for tiling service
   * @returns Health status
   */
  @Get("health")
  async checkHealth() {
    return this.tilesService.checkTilingServerHealth();
  }
}
