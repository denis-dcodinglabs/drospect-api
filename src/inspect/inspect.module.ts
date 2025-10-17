import { Module, forwardRef } from "@nestjs/common";
import { InspectService } from "./inspect.service";
import { InspectController } from "./inspect.controller";
import { PrismaService } from "../prisma.service";
import { ImageModule } from "../images/image.module";
import { MailService } from "../helpers/mail-helper";
import { UserModule } from "../users/user.module";
import { ProjectModule } from "../project/project.module";

@Module({
  imports: [ImageModule, UserModule, forwardRef(() => ProjectModule)],
  controllers: [InspectController],
  providers: [InspectService, PrismaService, MailService],
  exports: [InspectService],
})
export class InspectModule {}
