import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { PrismaService } from "src/prisma.service";
import { WalletService } from "../wallet/wallet.service";
import { GcsUploadService } from "src/googleStorage/storage.service";
import { TransactionsService } from "src/transactions/transactions.service";

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    PrismaService,
    WalletService,
    GcsUploadService,
    TransactionsService,
  ],
  exports: [UserService],
})
export class UserModule {}
