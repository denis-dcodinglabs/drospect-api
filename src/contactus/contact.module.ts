// mail.module.ts
import { Module } from "@nestjs/common";
import { MailService } from "../helpers/mail-helper"; // Add the import statement for MailService
import { ContactController } from "../contactus/contact.controller"; // Add the import statement for ContactController
import { ProjectService } from "src/project/project.service";
import { ProjectModule } from "src/project/project.module";
import { UserModule } from "src/users/user.module";
import { PrismaService } from "src/prisma.service";

@Module({
  imports: [ProjectModule, UserModule],
  providers: [MailService, ProjectService, PrismaService],
  controllers: [ContactController],
  exports: [MailService],
})
export class MailModule {}
