import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import {
  TilesProxyService,
  TileJsonResponse,
  BoundsResponse,
  MetadataResponse,
} from "./tiles-proxy.service";
import { AxiosResponse } from "axios";

@Injectable()
export class TilesService {
  private readonly logger = new Logger(TilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tilesProxy: TilesProxyService,
  ) {}

  /**
   * Validate task access for a user
   * @param taskId Task ID
   * @param userId User ID (optional for public tasks)
   * @returns Task information if accessible
   */
  private async validateTaskAccess(taskId: string, userId?: string) {
    // Normalize missing or invalid token indicators
    if (
      userId === undefined ||
      userId === null ||
      userId === "No token found" ||
      userId === "Invalid token or missing subject" ||
      userId === "Error decoding token"
    ) {
      userId = undefined;
    }

    const task = await this.prisma.thermalProcessingTask.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    // Check if COG is available
    if (!task.cogUrl) {
      throw new NotFoundException(`COG not available for task ${taskId}`);
    }

    // Check if task is completed
    if (task.status !== "completed") {
      throw new NotFoundException(`Task ${taskId} is not completed yet`);
    }

    // For now, allow access if user owns the project
    // You can extend this with more sophisticated permission logic
    if (userId && task.project.user.id !== userId) {
      throw new ForbiddenException(`Access denied to task ${taskId}`);
    }

    return task;
  }

  /**
   * Get TileJSON for a task
   * @param taskId Task ID
   * @param userId User ID (optional)
   * @param queryParams Query parameters
   * @returns TileJSON response
   */
  async getTileJson(
    taskId: string,
    userId?: string,
    queryParams?: Record<string, any>,
  ): Promise<TileJsonResponse> {
    this.logger.debug(`Getting TileJSON for task ${taskId}, user ${userId}`);

    // Validate access
    await this.validateTaskAccess(taskId, userId);

    // Proxy to Python tiling server
    return this.tilesProxy.getTileJson(taskId, queryParams);
  }

  /**
   * Get bounds for a task
   * @param taskId Task ID
   * @param userId User ID (optional)
   * @param queryParams Query parameters
   * @returns Bounds response
   */
  async getBounds(
    taskId: string,
    userId?: string,
    queryParams?: Record<string, any>,
  ): Promise<BoundsResponse> {
    this.logger.debug(`Getting bounds for task ${taskId}, user ${userId}`);

    // Validate access
    await this.validateTaskAccess(taskId, userId);

    // Proxy to Python tiling server
    return this.tilesProxy.getBounds(taskId, queryParams);
  }

  /**
   * Get metadata for a task
   * @param taskId Task ID
   * @param userId User ID (optional)
   * @param queryParams Query parameters
   * @returns Metadata response
   */
  async getMetadata(
    taskId: string,
    userId?: string,
    queryParams?: Record<string, any>,
  ): Promise<MetadataResponse> {
    this.logger.debug(`Getting metadata for task ${taskId}, user ${userId}`);

    // Validate access
    await this.validateTaskAccess(taskId, userId);

    // Proxy to Python tiling server
    return this.tilesProxy.getMetadata(taskId, queryParams);
  }

  /**
   * Get tile for a task
   * @param taskId Task ID
   * @param z Zoom level
   * @param x Tile X coordinate
   * @param y Tile Y coordinate
   * @param format Image format
   * @param userId User ID (optional)
   * @param queryParams Query parameters
   * @returns Tile image response
   */
  async getTile(
    taskId: string,
    z: number,
    x: number,
    y: number,
    format: string,
    userId?: string,
    queryParams?: Record<string, any>,
  ): Promise<AxiosResponse<Buffer>> {
    this.logger.debug(
      `Getting tile for task ${taskId} at ${z}/${x}/${y}.${format}, user ${userId}`,
    );

    // Validate access
    await this.validateTaskAccess(taskId, userId);

    // Proxy to Python tiling server
    return this.tilesProxy.getTile(taskId, z, x, y, format, queryParams);
  }

  /**
   * Get task information for tile access
   * @param taskId Task ID
   * @param userId User ID (optional)
   * @returns Task information
   */
  async getTaskInfo(taskId: string, userId?: string) {
    this.logger.debug(`Getting task info for ${taskId}, user ${userId}`);

    const task = await this.validateTaskAccess(taskId, userId);

    return {
      id: task.id,
      projectId: task.projectId,
      status: task.status,
      cogUrl: task.cogUrl,
      tileServiceUrl: task.tileServiceUrl,
      bounds: task.bounds,
      maxZoom: task.maxZoom,
      minZoom: task.minZoom,
      cogCreatedAt: task.cogCreatedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  /**
   * List accessible tasks for a user
   * @param userId User ID
   * @param projectId Optional project ID filter
   * @returns List of accessible tasks with COG
   */
  async getAccessibleTasks(userId: string, projectId?: number) {
    this.logger.debug(
      `Getting accessible tasks for user ${userId}, project ${projectId}`,
    );

    const whereClause: any = {
      status: "completed",
      cogUrl: {
        not: null,
      },
      project: {
        user: {
          id: userId,
        },
      },
    };

    if (projectId) {
      whereClause.projectId = projectId;
    }

    const tasks = await this.prisma.thermalProcessingTask.findMany({
      where: whereClause,
      select: {
        id: true,
        projectId: true,
        status: true,
        cogUrl: true,
        tileServiceUrl: true,
        bounds: true,
        maxZoom: true,
        minZoom: true,
        cogCreatedAt: true,
        createdAt: true,
        updatedAt: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return tasks;
  }

  /**
   * Check if tiling server is healthy
   * @returns Health status
   */
  async checkTilingServerHealth() {
    return this.tilesProxy.checkHealth();
  }
}
