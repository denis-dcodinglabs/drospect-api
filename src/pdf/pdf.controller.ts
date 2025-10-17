import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  Body,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { PdfService } from "./pdf.service";
import { ProjectService } from "src/project/project.service";

@Controller("pdf")
export class PdfController {
  constructor(
    private readonly pdfService: PdfService,
    private readonly projectService: ProjectService,
  ) {}

  @Get("unhealthy-images/:projectId")
  async getUnhealthyImagesPdf(
    @Param("projectId") projectId: number,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.pdfService.generateUnhealthyImagesPdf(
      projectId,
    );

    // Determine project name for nicer filename
    let projectName = "Project";
    try {
      const { project } = await this.projectService.getProjectById(
        Number(projectId),
      );
      if (project?.name) {
        projectName = project.name;
      }
    } catch (err) {
      // In case fetching project fails, fallback to generic name
    }

    // Sanitize filename to remove illegal characters
    const sanitized = projectName.replace(/[\\/:*?"<>|]/g, "").trim();
    const fileName = `${sanitized} - Inspection Report.pdf`;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": pdfBuffer.length,
      "Access-Control-Expose-Headers": "Content-Disposition",
    });
    res.end(pdfBuffer);
  }

  @Post("unhealthy-images/:projectId")
  async postUnhealthyImagesPdf(
    @Param("projectId") projectId: number,
    @Res() res: Response,
    @Body("imageIds") imageIds: number[] = [],
  ) {
    const normalizedIds: number[] = Array.isArray(imageIds)
      ? imageIds.map((n: any) => Number(n)).filter((n) => Number.isFinite(n))
      : [];

    const pdfBuffer = await this.pdfService.generateUnhealthyImagesPdf(
      projectId,
      normalizedIds,
    );

    let projectName = "Project";
    try {
      const { project } = await this.projectService.getProjectById(
        Number(projectId),
      );
      if (project?.name) {
        projectName = project.name;
      }
    } catch (err) {}

    const sanitized = projectName.replace(/[\\/:*?"<>|]/g, "").trim();
    const fileName = `${sanitized} - Inspection Report.pdf`;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": pdfBuffer.length,
      "Access-Control-Expose-Headers": "Content-Disposition",
    });
    res.end(pdfBuffer);
  }

  @Post("share/:projectId")
  async sharePdfReport(
    @Param("projectId") projectId: number,
    @Res() res: Response,
  ) {
    try {
      const shareUrl = await this.pdfService.sharePdfReport(projectId);
      res.json({ shareUrl });
    } catch (error) {
      res.status(500).json({ error: "Failed to share PDF report" });
    }
  }

  @Post("share-blob")
  @UseInterceptors(FileInterceptor("pdf"))
  async sharePdfBlob(@UploadedFile() file: any, @Res() res: Response) {
    try {
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const shareUrl = await this.pdfService.sharePdfBlob(file);
      res.json({ shareUrl });
    } catch (error) {
      res.status(500).json({ error: "Failed to share PDF blob" });
    }
  }
}
