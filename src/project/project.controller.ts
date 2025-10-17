// project.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  Request,
  UnauthorizedException,
  UseGuards,
  Logger,
} from "@nestjs/common";
import { ProjectService } from "./project.service";
import { ProjectDto } from "./project.model";
import {
  getDecodedToken,
  getSubIdFromToken,
} from "src/decodedToken/getSubIdFromToken";
import { JwtAuthGuard } from "src/authentication/auth.guard";
import { CreateProjectDto, UpdateProjectDto } from "./dto/project.dto";
import { MailService } from "src/helpers/mail-helper";
import { RolesGuard } from "src/authentication/roles.guard";
import { Roles } from "src/authentication/roles.decorator";
import { UserRole } from "src/constants/role.constants";
import { WalletService } from "src/wallet/wallet.service";
import { ImageService } from "src/images/image.service";
import { InspectService } from "../inspect/inspect.service";
import { UserService } from "src/users/user.service";

@Controller("/projects")
export class ProjectController {
  private readonly logger = new Logger(ProjectController.name);

  constructor(
    private readonly projectService: ProjectService,
    private readonly imageService: ImageService,
    private readonly walletService: WalletService,
    private readonly mailService: MailService,
    private readonly inspectService: InspectService,
    private readonly userService: UserService,
  ) {}

  @Get("/version")
  async getVersion(): Promise<{
    status: string;
    data: { version: string; timestamp: string };
  }> {
    return {
      status: "Ok!",
      data: {
        version: "v1.1.81",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard) // Use the RolesGuard
  @Roles(UserRole.Superadmin) // Specify the required role
  @Get()
  async getAllProjects(): Promise<{ status: string; data: ProjectDto[] }> {
    // Wrap response in data object
    const projects = await this.projectService.getAllProjects();
    return { status: "Ok!", data: projects }; // Wrap the response in a data object
  }

  @UseGuards(JwtAuthGuard)
  @Get("/me/:id?")
  async getProjectsByUserId(
    @Req() request: Request,
    @Param("id") id?: string,
  ): Promise<{ status: string; data: ProjectDto[] }> {
    const authorizationHeader = request.headers["authorization"];
    const subId = getSubIdFromToken(authorizationHeader);
    const user = getDecodedToken(authorizationHeader) as {
      role: string;
    };
    const userRole = user.role;
    if (id && userRole === UserRole.Superadmin) {
      const projects = await this.projectService.getallProjectsById(id);
      return { status: "Ok!", data: projects };
    } else {
      const projects = await this.projectService.getallProjectsById(subId);
      return { status: "Ok!", data: projects };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createProject(
    @Req() request: Request,
    @Body() postData: CreateProjectDto,
  ): Promise<{ status: string; data: any }> {
    const authorizationHeader = request.headers["authorization"];
    const subId = getSubIdFromToken(authorizationHeader);
    const project = await this.projectService.createProject(postData, subId);
    return {
      status: "Ok!",
      data: project,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async getProjectById(
    @Param("id") id: number,
    @Req() request: Request,
  ): Promise<{ status: string; data: ProjectDto }> {
    const authorizationHeader = request.headers["authorization"];
    const subId = getSubIdFromToken(authorizationHeader);
    const user = getDecodedToken(authorizationHeader) as {
      role: string;
    };
    const userRole = user.role;

    const project = await this.projectService.getProjectById(+id);

    if (!project) {
      throw new NotFoundException("Project not found");
    }
    //TODO add this field to other APIS
    if (
      userRole === UserRole.Superadmin ||
      project.project.user.connect.id === subId
    ) {
      return { status: "Ok!", data: project }; // Wrap the response in a data object
    } else {
      throw new UnauthorizedException(
        "You do not have permission to access this project",
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put("/:id")
  async editProject(
    @Req() request: Request,
    @Body() postData: any,
    @Param("id") id: number,
  ): Promise<{ status: string; data: UpdateProjectDto }> {
    // Wrap response in data object
    try {
      const updatedProject = await this.projectService.editProject(
        +id,
        postData,
      );
      return { status: "Ok!", data: updatedProject };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  async deleteProject(
    @Param("id") id: string,
  ): Promise<{ status: string; data: { message: string } }> {
    try {
      const message = await this.projectService.deleteProject(+id);
      return { status: "Ok!", data: message };
    } catch (error) {
      throw new HttpException(error.response, error.status);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post("/mail")
  async mailTriggerAndAltitude(
    @Req() request: Request,
    @Body()
    data: {
      id: number;
      projectName: string;
      numberOfFiles: number;
      altitude: string;
      drone: any;
      selectedImages: any[];
    },
  ): Promise<{ status: string; data: { message: string; jobId?: number } }> {
    try {
      if (
        !data.id ||
        !data.projectName ||
        !data.numberOfFiles ||
        !data.altitude
      ) {
        throw new HttpException(
          { message: "Missing required fields" },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!data.selectedImages) {
        try {
          const allImages = await this.imageService.getImagesbyId(
            1,
            data.numberOfFiles,
            data.id,
            undefined,
            false,
            undefined,
            false,
          );
          const extractedImages = allImages.images.map((image) => ({
            imageId: (image as any).id,
            imageUrl: image.image,
            imageName: (image as any).imageName,
          }));

          data.selectedImages = extractedImages;
        } catch (error) {
          this.logger.error(`Error fetching images: ${error.message}`);
          throw new HttpException(
            { message: "Failed to fetch project images" },
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }

      // Mark selected images as queued for processing
      if (data.selectedImages && data.selectedImages.length > 0) {
        const imageIds = data.selectedImages.map((img) => img.imageId);
        await this.imageService.markImagesQueued(imageIds);
        this.logger.log(
          `Marked ${imageIds.length} images as queued for processing`,
        );
      }

      const authorizationHeader = request.headers["authorization"];
      const subId = getSubIdFromToken(authorizationHeader);
      const { id, projectName, numberOfFiles, altitude } = data;

      try {
        // OPTIMIZATION: Run database operations in parallel instead of sequence
        const [isRunning, jobId] = await Promise.all([
          this.inspectService.isJobRunning(),
          this.inspectService.createJob(id, altitude, 1, numberOfFiles),
        ]);

        if (isRunning) {
          this.logger.log(
            `[MAIL] Job already running, new job will be queued as pending`,
          );
        }

        // OPTIMIZATION: Handle wallet credits in parallel with other operations
        const creditPromise = this.walletService.checkAndDeductCredits(
          subId,
          numberOfFiles,
          altitude,
          id,
          projectName,
        );

        // OPTIMIZATION: Update project status in parallel
        const projectUpdatePromise = this.projectService.editProjectInspection(
          +id,
          true,
        );

        // OPTIMIZATION: Send emails in background (don't wait for them)
        const emailPromises = [];

        // Initial email notification
        const notification = emailPromises.push(
          this.mailService
            .mailImageTrigger(
              +id,
              projectName,
              numberOfFiles,
              data.drone || { make: "Unknown", model: "Unknown" },
            )
            .catch((err) =>
              this.logger.error(`Email notification failed: ${err.message}`),
            ),
        );
        console.log("notification sent: ", notification);

        // User notification email
        try {
          const user = await this.userService.getUserById(subId);
          if (user && user.email) {
            emailPromises.push(
              this.mailService
                .mailImageInspectionStarted(
                  +id,
                  projectName,
                  numberOfFiles,
                  user.email,
                )
                .then(() => console.log("user email sent", user.email))
                .catch((err) =>
                  this.logger.error(`User email failed: ${err.message}`),
                ),
            );
          }
        } catch (userError) {
          this.logger.error(
            `Error getting user for email: ${userError.message}`,
          );
        }

        // Wait for critical operations to complete
        await Promise.all([creditPromise, projectUpdatePromise]);

        // Start emails in background
        Promise.all(emailPromises).catch((err) =>
          this.logger.error(
            `Background email processing failed: ${err.message}`,
          ),
        );

        // OPTIMIZATION: Start processing immediately if no job running
        if (!isRunning) {
          // Process job immediately instead of using setImmediate
          this.inspectService.processNextJob().catch((err) => {
            this.logger.error(`Error processing job: ${err}`);
          });
        }

        return {
          status: "Ok!",
          data: {
            message: isRunning
              ? "Email notifications sent and inspection job queued (pending)"
              : "Email notifications sent and inspection job started",
            jobId,
          },
        };
      } catch (error) {
        this.logger.error(`Error in job processing: ${error.message}`);
        throw new HttpException(
          error.response || { message: "Failed to process inspection job" },
          error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      this.logger.error(`Error in mail trigger: ${error.message}`);
      throw new HttpException(
        error.response || { message: "Internal server error" },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
