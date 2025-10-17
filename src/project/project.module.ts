import { Module, forwardRef } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { ProjectController } from "./project.controller";
import { ProjectService } from "./project.service";
import { MailService } from "src/helpers/mail-helper";
import { WalletService } from "src/wallet/wallet.service";
import { ImageService } from "src/images/image.service";
import { TransactionsService } from "src/transactions/transactions.service";
import { TransactionsModule } from "src/transactions/transactions.module";
import { InspectModule } from "../inspect/inspect.module";
import { UserModule } from "src/users/user.module";

@Module({
  controllers: [ProjectController],
  providers: [
    ProjectService,
    PrismaService,
    MailService,
    WalletService,
    ImageService,
    TransactionsService,
  ],
  imports: [TransactionsModule, forwardRef(() => InspectModule), UserModule],
  exports: [ProjectService],
})
export class ProjectModule {}
