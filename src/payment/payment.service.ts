// src/payments/payment.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { Prisma, Payment } from "@prisma/client";

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Payment[]> {
    return this.prisma.payment.findMany();
  }

  async findOne(id: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({ where: { id } });
  }

  async getAllById(subId: string): Promise<Payment[]> {
    const payments = await this.prisma.payment.findMany({
      where: {
        userId: subId,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
    return payments;
  }

  async create(data: {
    credits: number;
    status: string;
    userId: string;
    packageId?: string;
  }): Promise<Payment> {
    const paymentData: Prisma.PaymentUncheckedCreateInput = {
      credits: data.credits,
      status: data.status,
      userId: data.userId,
      packageId: data.packageId,
    };

    const payment = await this.prisma.payment.create({
      data: paymentData,
    });

    return payment;
  }

  async update(id: string, data: Partial<Payment>): Promise<Payment> {
    return this.prisma.payment.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string): Promise<Payment> {
    return this.prisma.payment.delete({ where: { id } });
  }
}
