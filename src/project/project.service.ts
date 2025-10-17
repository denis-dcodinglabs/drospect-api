import { PrismaService } from "../prisma.service";
import { Injectable, NotFoundException } from "@nestjs/common";
import { ProjectDto, PanelStatisticsSummary } from "./project.model";
import { CreateProjectDto } from "./dto/project.dto";
import { ImageService } from "../images/image.service";

@Injectable()
export class ProjectService {
  private imageService: ImageService;
  constructor(private prisma: PrismaService) {
    this.imageService = new ImageService(prisma);
  }

  private aggregatePanelStatistics(
    panelStatistics: any[],
  ): PanelStatisticsSummary {
    const aggregated = panelStatistics.reduce(
      (acc, record) => {
        acc.totalImages += record.totalImages;
        acc.healthyPanels += record.healthyPanels;
        acc.unhealthyPanels += record.unhealthyPanels;
        acc.inspectedPanels += record.inspectedPanels;
        return acc;
      },
      {
        totalImages: 0,
        healthyPanels: 0,
        unhealthyPanels: 0,
        inspectedPanels: 0,
      },
    );

    return {
      ...aggregated,
      processing: aggregated.totalImages - aggregated.inspectedPanels,
    };
  }

  async getAllProjects(): Promise<ProjectDto[]> {
    const projects = await this.prisma.project.findMany({
      where: { isactive: true },
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        latitude: true,
        longitude: true,
        megawatt: true,
        isactive: true,
        imagecounter: true,
        allrgb: true,
        user: true,
        createdAt: true,
        updatedAt: true,
        isinspected: true,
        drone: true,
      },
    });

    // Compute hasOrthomosaic per project in a single grouped query
    const projectIds = projects.map((p) => p.id);
    let projectsWithOrtho = new Set<number>();
    if (projectIds.length > 0) {
      const grouped = await this.prisma.thermalProcessingTask.groupBy({
        by: ["projectId"],
        where: {
          projectId: { in: projectIds },
          OR: [{ status: "completed" }, { resultUrl: { not: null } }],
        },
        _count: { _all: true },
      });
      projectsWithOrtho = new Set(
        grouped.filter((g) => g._count._all > 0).map((g) => g.projectId),
      );
    }

    // Map the Prisma project data to the ProjectDTO
    const projectsDTO: ProjectDto[] = projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      location: project.location,
      latitude: project.latitude,
      longitude: project.longitude,
      megawatt: project.megawatt,
      isactive: project.isactive,
      imagecounter: project.imagecounter,
      allrgb: project.allrgb,
      createdat: project.createdAt,
      updatedat: project.updatedAt,
      isinspected: project.isinspected,
      hasOrthomosaic: projectsWithOrtho.has(project.id),
      drone: project.drone,
      user: {
        connect: {
          id: project.user.id,
        },
      },
    }));

    return projectsDTO;
  }

  async getallProjectsById(subId: string): Promise<ProjectDto[]> {
    const projects = await this.prisma.project.findMany({
      where: {
        isactive: true,
        userId: subId,
      },
      include: {
        panelStatistics: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Compute hasOrthomosaic per project in a single grouped query
    const projectIds = projects.map((p) => p.id);
    let projectsWithOrtho = new Set<number>();
    if (projectIds.length > 0) {
      const grouped = await this.prisma.thermalProcessingTask.groupBy({
        by: ["projectId"],
        where: {
          projectId: { in: projectIds },
          OR: [{ status: "completed" }, { resultUrl: { not: null } }],
        },
        _count: { _all: true },
      });
      projectsWithOrtho = new Set(
        grouped.filter((g) => g._count._all > 0).map((g) => g.projectId),
      );
    }

    // Map the Prisma project data to the ProjectDTO
    const projectsDTO: ProjectDto[] = projects.map((project) => {
      const panelStatistics =
        project.panelStatistics.length > 0
          ? this.aggregatePanelStatistics(project.panelStatistics)
          : {
              totalImages: 0,
              healthyPanels: 0,
              unhealthyPanels: 0,
              inspectedPanels: 0,
              processing: 0,
            };

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        location: project.location,
        latitude: project.latitude,
        longitude: project.longitude,
        megawatt: project.megawatt,
        isactive: project.isactive,
        imagecounter: project.imagecounter,
        allrgb: project.allrgb,
        createdat: project.createdAt,
        updatedat: project.updatedAt,
        isinspected: project.isinspected,
        hasOrthomosaic: projectsWithOrtho.has(project.id),
        drone: project.drone,
        panelStatistics,
        user: {
          connect: {
            id: project.userId,
          },
        },
      };
    });

    return projectsDTO;
  }

  async getProjectById(projectId: number): Promise<any> {
    const project = await this.prisma.project.findUnique({
      where: {
        isactive: true,
        id: projectId,
      },
    });
    const panelStatistics = await this.imageService.getPanelStatistics(
      projectId,
    );
    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const hasOrtho = await this.prisma.thermalProcessingTask.findFirst({
      where: {
        projectId,
        OR: [{ status: "completed" }, { resultUrl: { not: null } }],
      },
      select: { id: true },
    });

    // Map the Prisma project data to the ProjectDTO
    const data: ProjectDto = {
      id: project.id,
      name: project.name,
      description: project.description,
      location: project.location,
      latitude: project.latitude,
      longitude: project.longitude,
      megawatt: project.megawatt,
      isactive: project.isactive,
      imagecounter: project.imagecounter,
      allrgb: project.allrgb,
      isinspected: project.isinspected,
      hasOrthomosaic: Boolean(hasOrtho),
      drone: project.drone,
      user: {
        connect: {
          id: project.userId,
        },
      },
      createdat: project.createdAt,
      updatedat: project.updatedAt,
    };

    return { project: data, panelStatistics };
  }

  async createProject(
    createProjectDto: CreateProjectDto,
    subId: string,
  ): Promise<any> {
    const project = await this.prisma.project.create({
      data: {
        ...createProjectDto,
        user: {
          connect: {
            id: subId,
          },
        },
      },
    });
    return { message: "Project created successfully.", project };
  }

  async editProject(projectId: number, editProjectDto: any): Promise<any> {
    try {
      const project = await this.prisma.project.update({
        where: {
          id: projectId,
        },
        data: {
          ...editProjectDto,
        },
      });

      return { message: "Project updated successfully.", project };
    } catch (error) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }
  }

  async deleteProject(projectId: number): Promise<{ message: string }> {
    try {
      await this.prisma.project.update({
        where: {
          id: projectId,
        },
        data: {
          isactive: false,
        },
      });

      return { message: "Project deleted successfully." };
    } catch (error) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }
  }
  async getProjectIdByName(projectName: string): Promise<any> {
    const project = await this.prisma.project.findFirst({
      where: {
        name: projectName,
      },
    });

    return project?.id;
  }

  async updateImageCount(projectId: number, imageCount: number): Promise<any> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const newImageCount = project.imagecounter + imageCount;

    return this.prisma.project.update({
      where: { id: projectId },
      data: { imagecounter: newImageCount },
    });
  }
  async editProjectInspection(
    projectId: number,
    isinspected: boolean,
    latitude?: number,
    longitude?: number,
  ): Promise<any> {
    const updateData: any = { isinspected };

    if (latitude !== undefined) {
      updateData.latitude = latitude;
    }
    if (longitude !== undefined) {
      updateData.longitude = longitude;
    }
    await this.prisma.project.update({
      where: { id: projectId },
      data: updateData,
    });
    return { message: "Project inspection updated successfully." };
  }

  async updateAllRgb(projectId: number, allrgb: boolean): Promise<void> {
    await this.prisma.project.update({
      where: { id: projectId },
      data: { allrgb },
    });
  }
}
