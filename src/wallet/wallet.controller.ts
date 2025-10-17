// src/payments/wallet.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Delete,
  UseGuards,
  Req,
} from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { getSubIdFromToken } from "src/decodedToken/getSubIdFromToken";
import { JwtAuthGuard } from "src/authentication/auth.guard";

@Controller("/wallet")
export class WalletController {
  constructor(private walletService: WalletService) {}

  @UseGuards(JwtAuthGuard)
  @Get("/me")
  async getWalletByUserId(
    @Req() request: Request,
  ): Promise<{ status: string; data: any }> {
    const authorizationHeader = request.headers["authorization"];
    const subId = getSubIdFromToken(authorizationHeader);

    const wallet = await this.walletService.getWalletByUserId(subId);

    return { status: "Ok!", data: wallet };
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.walletService.findOne(id);
  }

  @Post()
  create(@Body() data: { userId: string; credits: number }) {
    return this.walletService.create(data);
  }

  // @Put(":id")
  // update(
  //   @Param("id") id: string,
  //   @Body() data: Partial<{ userId: string; credits: number }>,
  // ) {
  //   return this.walletService.update(id, data);
  // }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.walletService.delete(id);
  }
}
