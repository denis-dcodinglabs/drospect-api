import { Module } from "@nestjs/common";
import { ScopitoController } from "./scopito.controller";
import { ScopitoService } from "./scopito.service";
import { PrismaService } from "../prisma.service";
import { InspectModule } from "../inspect/inspect.module";

@Module({
  imports: [InspectModule],
  controllers: [ScopitoController],
  providers: [ScopitoService, PrismaService],
  exports: [ScopitoService],
})
export class ScopitoModule {}
