import { Controller, Post, Body, Param, Get, UseGuards } from "@nestjs/common";
import { ImageService } from "./image.service";
import { PanelInfoDto } from "./image.model";
import { JwtAuthGuard } from "../authentication/auth.guard";

@Controller("projects/image")
@UseGuards(JwtAuthGuard)
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Post(":id/panels")
  async updatePanelInformation(
    @Param("id") id: string,
    @Body() panelInformation: PanelInfoDto[],
  ): Promise<void> {
    return this.imageService.updatePanelInformation(
      parseInt(id),
      panelInformation,
    );
  }

  @Get(":id/panels")
  async getImageWithPanelInformation(@Param("id") id: string) {
    return this.imageService.getImageWithPanelInformation(parseInt(id));
  }
}
