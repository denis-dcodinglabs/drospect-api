import { Module } from "@nestjs/common";
import { GcsUploadService } from "./storage.service";
import { GcsUploadController } from "./storage.controller";

@Module({
  controllers: [GcsUploadController],
  providers: [GcsUploadService],
  exports: [GcsUploadService],
})
export class StorageModule {}
