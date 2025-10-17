// src/payments/wallet.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { Wallet } from "@prisma/client";
import { TransactionsService } from "src/transactions/transactions.service";

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private transactionservice: TransactionsService,
  ) {}

  async getWalletByUserId(userId: string): Promise<Wallet> {
    // Find the wallet record by userId
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId }, // Find the wallet by userId
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet not found for userId: ${userId}`);
    }

    return wallet; // Return the found wallet
  }

  async findOne(id: string): Promise<Wallet | null> {
    return this.prisma.wallet.findUnique({ where: { id } });
  }

  async create(data: { userId: string; credits: number }): Promise<Wallet> {
    return this.prisma.wallet.create({ data });
  }

  async updateByUserId(userId: string, data: Partial<Wallet>): Promise<Wallet> {
    // Find the wallet record by userId
    let wallet = await this.prisma.wallet.findFirst({
      where: { userId }, // Find the wallet by userId
    });

    // If no wallet exists, create a new one
    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          userId,
          credits: data.credits || 0,
        },
      });
      return wallet;
    }
    // Calculate the new credits
    const newCredits = (wallet.credits || 0) + (data.credits || 0); // Ensure to handle undefined values

    // Update the found wallet record with the new credits
    return this.prisma.wallet.update({
      where: { id: wallet.id }, // Use the found wallet's id for the update
      data: { credits: newCredits }, // Update the credits field
    });
  }

  async delete(id: string): Promise<Wallet> {
    return this.prisma.wallet.delete({ where: { id } });
  }

  async checkAndDeductCredits(
    userId: string,
    numberOfImages: number,
    altitude: string,
    projectId: number,
    projectName: string,
  ): Promise<void> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException(
        `You have no credits! Please purchase credits to proceed.`,
      );
    }

    const creditsPerImage = altitude === "LOW" || altitude === "ROOF" ? 2 : 1;
    const totalCreditsRequired = numberOfImages * creditsPerImage;
    if (wallet.credits < totalCreditsRequired) {
      throw new BadRequestException("Insufficient credits");
    }
    await this.prisma.wallet.update({
      where: { userId },
      data: { credits: { decrement: totalCreditsRequired } },
    });

    await this.transactionservice.createTransaction(
      {
        projectId: projectId,
        credits: totalCreditsRequired,
        projectName: projectName,
        inspectedPanels: numberOfImages,
      },
      userId,
    );
  }
}
