import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { PackageDto } from "./dto/package.dto";
import { PrismaService } from "../prisma.service";

@Injectable()
export class PackageService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.package.findMany();
  }

  async findOne(id: string) {
    const pkg = await this.prisma.package.findUnique({ where: { id } });
    if (!pkg) {
      throw new HttpException(
        {
          status: "Error",
          error: {
            type: "PackageNotFoundError",
            message: `Package with id ${id} not found`,
          },
        },
        HttpStatus.NOT_FOUND,
      );
    }
    return pkg;
  }

  async getCredits(id: string): Promise<number> {
    const pkg = await this.prisma.package.findUnique({
      where: { id },
      select: { credits: true },
    });
    if (!pkg) {
      throw new HttpException(
        {
          status: "Error",
          error: {
            type: "PackageNotFoundError",
            message: `Package with id ${id} not found`,
          },
        },
        HttpStatus.NOT_FOUND,
      );
    }
    return pkg.credits;
  }

  async create(data: PackageDto) {
    return await this.prisma.package.create({ data });
  }

  async update(id: string, data: Partial<PackageDto>) {
    const pkg = await this.prisma.package.findUnique({ where: { id } });
    if (!pkg) {
      throw new HttpException(
        {
          status: "Error",
          error: {
            type: "PackageNotFoundError",
            message: `Package with id ${id} not found`,
          },
        },
        HttpStatus.NOT_FOUND,
      );
    }
    return await this.prisma.package.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    const pkg = await this.prisma.package.findUnique({ where: { id } });
    if (!pkg) {
      throw new HttpException(
        {
          status: "Error",
          error: {
            type: "PackageNotFoundError",
            message: `Package with id ${id} not found`,
          },
        },
        HttpStatus.NOT_FOUND,
      );
    }
    await this.prisma.package.delete({ where: { id } });
    return { message: `Package with id ${id} deleted successfully` };
  }
}
