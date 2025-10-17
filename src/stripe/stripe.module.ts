import { Module } from "@nestjs/common";
import { PaymentController } from "./stripe.controller";
import { WalletService } from "../wallet/wallet.service"; // Import your wallet service
import { PackageService } from "../package/package.service"; // Import your package service
import { PrismaService } from "src/prisma.service";
import { PaymentService } from "src/payment/payment.service";
import { TransactionsService } from "src/transactions/transactions.service";

@Module({
  controllers: [PaymentController],
  providers: [
    WalletService,
    PaymentService,
    PackageService,
    PrismaService,
    TransactionsService,
  ], // Add your services here
})
export class StripeModule {}
