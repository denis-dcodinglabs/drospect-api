// src/payments/payment.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Put,
  Delete,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { getSubIdFromToken } from "src/decodedToken/getSubIdFromToken";
import { JwtAuthGuard } from "src/authentication/auth.guard";
import { Request } from "express";

@Controller("/payments")
export class PaymentController {
  constructor(private paymentService: PaymentService) {}
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.paymentService.findAll();
  }
  @UseGuards(JwtAuthGuard)
  @Get("/me")
  async getMyPayments(@Req() request: Request) {
    const subId = getSubIdFromToken(request.headers["authorization"]);
    return this.paymentService.getAllById(subId);
  }
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() data: { credits: number; status: string },
    @Req() request: Request,
  ) {
    const subId = getSubIdFromToken(request.headers["authorization"]);

    return this.paymentService.create({
      ...data,
      userId: subId,
    });
  }
  @UseGuards(JwtAuthGuard)
  @Put(":id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body() data: { status: string },
    @Req() request: Request,
  ) {
    try {
      const subId = getSubIdFromToken(request.headers["authorization"]);
      // First verify the payment belongs to the user
      const payment = await this.paymentService.findOne(id);
      if (!payment || payment.userId !== subId) {
        throw new HttpException(
          "Payment not found or unauthorized",
          HttpStatus.NOT_FOUND,
        );
      }

      return this.paymentService.update(id, {
        status: data.status,
      });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  async delete(@Param("id") id: string) {
    try {
      const deletionResult = await this.paymentService.delete(id.toString());
      return { status: "Ok!", data: deletionResult };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }
}
