import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { PrismaModule } from "../prisma.module";
import { TilesController } from "./tiles.controller";
import { TilesService } from "./tiles.service";
import { TilesProxyService } from "./tiles-proxy.service";

@Module({
  imports: [
    PrismaModule,
    HttpModule.register({
      timeout: 60000, // 60 seconds timeout for tile requests
      maxRedirects: 5,
    }),
  ],
  controllers: [TilesController],
  providers: [TilesService, TilesProxyService],
  exports: [TilesService, TilesProxyService],
})
export class TilesModule {}
