// src/packages/package.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { WalletController } from "./wallet.controller";
import { WalletService } from "./wallet.service";
import { TransactionsService } from "src/transactions/transactions.service";

@Module({
  controllers: [WalletController],
  providers: [WalletService, PrismaService, TransactionsService],
})
export class WalletModule {}
