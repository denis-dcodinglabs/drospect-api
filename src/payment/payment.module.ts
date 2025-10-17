// src/payments/payments.module.ts
import { Module } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { PaymentController } from "./payment.controller";
import { PrismaService } from "../prisma.service"; // Ensure PrismaService is configured correctly
import { PackageService } from "src/package/package.service";

@Module({
  providers: [PaymentService, PrismaService, PackageService],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentsModule {}
