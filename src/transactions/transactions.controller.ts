import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";
import { TransactionsService } from "./transactions.service";
import { TransactionDto } from "./dto/transactions.dto";
import { getSubIdFromToken } from "src/decodedToken/getSubIdFromToken";
import { PrismaService } from "src/prisma.service";

@Controller("transaction")
export class TransactionsController {
  constructor(
    private transactionsService: TransactionsService,
    private prisma: PrismaService,
  ) {}

  @Post()
  async createTransaction(
    @Req() request: Request,
    @Body() TransactionDto: TransactionDto,
  ) {
    const authorizationHeader = request.headers["authorization"];
    const subId = getSubIdFromToken(authorizationHeader);
    const transaction = await this.transactionsService.createTransaction(
      TransactionDto,
      subId,
    );
    return {
      status: "success",
      message: "Transaction created successfully",
      data: transaction,
    };
  }
  @Get()
  async getAllTransactions(@Req() request: Request) {
    try {
      const authorizationHeader = request.headers["authorization"];
      const subId = getSubIdFromToken(authorizationHeader);
      const transactions = await this.transactionsService.getUserTransactions(
        subId,
      );
      return transactions;
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
