import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { TransactionDto } from "./dto/transactions.dto";

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async createTransaction(transactionDto: TransactionDto, userId: string) {
    const { projectId, credits, projectName, inspectedPanels } = transactionDto;
    try {
      // Create a new credit transaction
      const transaction = await this.prisma.creditTransaction.create({
        data: {
          projectId: projectId,
          credits,
          projectName,
          inspectedPanels,
          userId: userId,
        },
      });

      return {
        status: "Ok!",
        message: "Transaction created successfully",
        data: transaction,
      };
    } catch (error) {
      throw new HttpException(
        {
          status: "Error",
          error: {
            type: "TransactionCreationError",
            message: error.message || "Failed to create transaction!",
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getUserTransactions(userId: string) {
    try {
      const transactions = await this.prisma.creditTransaction.findMany({
        where: {
          userId: userId,
        },
      });
      return {
        status: "success",
        data: transactions,
      };
    } catch (error) {
      throw new HttpException(
        {
          status: "Error",
          error: {
            type: "TransactionFetchError",
            message: error.message || "Failed to fetch transactions!",
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
