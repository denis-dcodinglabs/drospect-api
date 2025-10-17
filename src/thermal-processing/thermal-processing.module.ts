import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma.module";
import { StorageModule } from "../googleStorage/storage.module";
import { NodeOdmService } from "./nodeodm.service";
import { ThermalProcessingService } from "./thermal-processing.service";
import { ThermalProcessingController } from "./thermal-processing.controller";
import { WebhookController } from "./webhook.controller";
import { ZipProcessingService } from "./zip-processing.service";
import { CogProcessingService } from "./cog-processing.service";
import { SplitCalculatorService } from "./split-calculator.service";
import { StreamingUploadService } from "./streaming-upload.service";
import { WalletService } from "../wallet/wallet.service";
import { TransactionsService } from "../transactions/transactions.service";
import { OrthoStarterScheduler } from "./thermo-auto-starter.scheduler";

@Module({
  imports: [PrismaModule, StorageModule],
  providers: [
    NodeOdmService,
    ThermalProcessingService,
    ZipProcessingService,
    CogProcessingService,
    SplitCalculatorService,
    StreamingUploadService,
    WalletService,
    TransactionsService,
    OrthoStarterScheduler,
  ],
  controllers: [ThermalProcessingController, WebhookController],
  exports: [
    ThermalProcessingService,
    NodeOdmService,
    ZipProcessingService,
    CogProcessingService,
    SplitCalculatorService,
    StreamingUploadService,
  ],
})
export class ThermalProcessingModule {}
