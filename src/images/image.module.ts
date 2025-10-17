import { Module } from "@nestjs/common";
import { ImageController } from "./image.controller";
import { ImagesController } from "./images.controller";
import { ImageService } from "./image.service";
import { DuplicateFilterService } from "./duplicate-filter/duplicate-filter.service";
import { ProjectService } from "src/project/project.service";
import { PrismaService } from "src/prisma.service";
import { StorageModule } from "src/googleStorage/storage.module";

@Module({
  imports: [StorageModule],
  controllers: [ImageController, ImagesController],
  providers: [
    ProjectService,
    PrismaService,
    ImageService,
    DuplicateFilterService,
  ],
  exports: [ImageService, DuplicateFilterService],
})
export class ImageModule {}
