import { Module } from "@nestjs/common";
import { InternalJobMonitoringService } from "./internal-job-monitoring.service";
import { PrismaModule } from "../prisma.module";
import { MailModule } from "../contactus/contact.module";

@Module({
  imports: [PrismaModule, MailModule],
  providers: [InternalJobMonitoringService],
  exports: [InternalJobMonitoringService],
})
export class InternalJobMonitoringModule {}
