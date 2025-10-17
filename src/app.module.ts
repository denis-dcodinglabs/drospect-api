import {
  Module,
  NestModule,
  RequestMethod,
  MiddlewareConsumer,
} from "@nestjs/common";
import { PrismaService } from "./prisma.service";

import { UserModule } from "./users/user.module";
import { AuthModule } from "./authentication/auth.module";

import { SoftDeleteMiddleware } from "./middlewares/softDelete.middleware";
import { StorageModule } from "./googleStorage/storage.module";
import { MetadataModule } from "./gpsMap/coordinate.module";
import { ProjectModule } from "./project/project.module";
import { CommentModule } from "./comment/comment.module";
import { MailModule } from "./contactus/contact.module";
import { ImageModule } from "./images/image.module";
import { ImageService } from "./images/image.service";
import { LargePayloadMiddleware } from "./middlewares/large-payload.middleware";
import { PdfService } from "./pdf/pdf.service";
import { PdfController } from "./pdf/pdf.controller";
import { GcsUploadService } from "./googleStorage/storage.service";
import { PrismaModule } from "./prisma.module";
import { ProjectService } from "./project/project.service";
import { PaymentsModule } from "./payment/payment.module";
import { PaymentService } from "./payment/payment.service";
import { PackageModule } from "./package/package.module";
import { WalletModule } from "./wallet/wallet.module";
import { StripeModule } from "./stripe/stripe.module";
import { TransactionsModule } from "./transactions/transactions.module";
import { TransactionsService } from "./transactions/transactions.service";
import { InspectModule } from "./inspect/inspect.module";
import { ImageProcessingModule } from "./image-processing/image-processing.module";
import { ThermalProcessingModule } from "./thermal-processing/thermal-processing.module";
import { TilesModule } from "./tiles/tiles.module";
import { ScopitoModule } from "./scopito/scopito.module";
import { NasaIrradianceService } from "./energy/nasa-irradiance.service";
import { ReverseGeocodeService } from "./energy/reverse-geocode.service";
import { LoggerModule } from "./common/logger/logger.module";
import { ScheduleModule } from "@nestjs/schedule";
import { InternalJobMonitoringModule } from "./internal-monitoring/internal-job-monitoring.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    UserModule,
    AuthModule,

    StorageModule,
    MetadataModule,
    ProjectModule,
    MailModule,
    ImageModule,
    CommentModule,
    PrismaModule,
    PaymentsModule,
    PackageModule,
    WalletModule,
    StripeModule,
    TransactionsModule,
    InspectModule,
    ImageProcessingModule,
    ThermalProcessingModule,
    TilesModule,
    ScopitoModule,
    LoggerModule,
    InternalJobMonitoringModule,
  ],
  controllers: [PdfController],
  providers: [
    PrismaService,
    ImageService,
    PdfService,
    GcsUploadService,
    ProjectService,
    PaymentService,
    TransactionsService,
    NasaIrradianceService,
    ReverseGeocodeService,
  ],
  exports: [PrismaService, ImageService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SoftDeleteMiddleware)
      .forRoutes()
      .apply(LargePayloadMiddleware)
      .forRoutes({ path: "projects/upload", method: RequestMethod.POST });
  }
}
