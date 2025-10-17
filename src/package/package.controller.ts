import {
  Controller,
  Get,
  Param,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { PackageService } from "./package.service";
// import { PackageDto } from "./dto/package.dto";

@Controller("/packages")
export class PackageController {
  constructor(private packageService: PackageService) {}

  @Get()
  async getAllPackages() {
    try {
      return await this.packageService.findAll();
    } catch (err) {
      throw new HttpException(
        {
          status: "Error",
          error: {
            type: "PackagesFetchError",
            message: err.message || "Failed to fetch packages!",
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(":id")
  async getPackage(@Param("id") id: string) {
    try {
      return await this.packageService.findOne(id);
    } catch (err) {
      throw new HttpException(
        {
          status: "Error",
          error: {
            type: "PackageFetchError",
            message: err.message || "Failed to fetch package!",
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
