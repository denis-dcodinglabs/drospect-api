import { Module } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { ImageProcessingController } from "./image-processing.controller";
import { CloudRunApiService } from "src/helpers/cloud-run-api-helper";
import { ImageService } from "src/images/image.service";
import { MailService } from "src/helpers/mail-helper";
import { WalletService } from "src/wallet/wallet.service";
import { ProjectService } from "src/project/project.service";
import { TransactionsService } from "src/transactions/transactions.service";
import { ImageProcessingPostService } from "src/helpers/image-processing-post-helper";

@Module({
  controllers: [ImageProcessingController],
  providers: [
    CloudRunApiService,
    ImageService,
    MailService,
    WalletService,
    ProjectService,
    PrismaService,
    TransactionsService,
    ImageProcessingPostService,
  ],
  exports: [CloudRunApiService, ImageProcessingPostService],
})
export class ImageProcessingModule {}
