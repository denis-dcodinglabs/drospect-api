/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { Request, Response } from "express";
import { JwtAuthGuard } from "src/authentication/auth.guard";
import {
  getDecodedToken,
  getSubIdFromToken,
} from "src/decodedToken/getSubIdFromToken";
import { RolesGuard } from "src/authentication/roles.guard";
import { Roles } from "src/authentication/roles.decorator";
import { UserRole } from "../constants/role.constants";
import { FileInterceptor } from "@nestjs/platform-express";
import { Multer } from "multer";
import { WalletService } from "../wallet/wallet.service";

@Controller("/user")
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly walletService: WalletService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard) // Use the RolesGuard
  @Roles(UserRole.Superadmin) // Specify the required role
  @UseGuards(JwtAuthGuard)
  async getAllUsers(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<any> {
    try {
      const result = await this.userService.getAllUsers();
      return response.status(200).json({
        status: "Ok!",
        message: "Successfully fetched data!",
        result: result,
      });
    } catch (err) {
      return response.status(500).json({
        status: "Ok!",
        message: "Internal Server Error!",
      });
    }
  }

  @Post("/update-profile")
  @UseInterceptors(FileInterceptor("image")) // Use Multer to handle file uploads
  async updateProfile(
    @Req() request: Request,
    @UploadedFile() file: Multer.File, // Get the uploaded file
    @Body() body: { firstName?: string; lastName?: string }, // Accept firstName and lastName in the body
  ): Promise<any> {
    const authorizationHeader = request.headers["authorization"];
    const decodedToken = getDecodedToken(authorizationHeader) as {
      username: string;
      [key: string]: any;
    };
    // Extract the username
    const subId = decodedToken.sub;

    try {
      let publicUrl: string | undefined;

      // If a file is uploaded, upload the image and get the public URL
      if (file) {
        publicUrl = await this.userService.uploadProfileImage(
          file.buffer,
          decodedToken.username,
          file.originalname,
        );
      }

      // Update the user's profile with the new data
      await this.userService.updateUserProfile(
        subId,
        body.firstName,
        body.lastName,
        publicUrl,
      );

      return {
        status: "Ok!",
        data: {
          message: "Profile updated successfully!",
          imageUrl: publicUrl,
          firstName: body.firstName,
          lastName: body.lastName,
        },
      };
    } catch (error) {
      return {
        status: "Error!",
        data: {
          message: "Failed to update profile!",
        },
      };
    }
  }
  // @Get(':username') // Define a route parameter for the username
  // async getUserProfile(
  //   @Param('username') username: string,
  //   @Res() response: Response,
  // ): Promise<any> {
  //   try {
  //     const user = await this.userService.getUserByUsername(username);

  //     if (!user) {
  //       return response.status(404).json({
  //         status: 'Not Found',
  //         message: 'User not found',
  //       });
  //     }

  //     return response.status(200).json({
  //       status: 'Ok!',
  //       message: 'User profile fetched successfully!',
  //       user: user,
  //     });
  //   } catch (error) {
  //     return response.status(500).json({
  //       status: 'Error',
  //       message: 'Internal Server Error!',
  //     });
  //   }
  // }
  @UseGuards(JwtAuthGuard)
  @Get("/me")
  async getUserByToken(@Req() request: Request): Promise<any> {
    const authorizationHeader = request.headers["authorization"];
    const subId = getSubIdFromToken(authorizationHeader);

    const user = await this.userService.getUserFromToken(subId);
    const wallet = await this.walletService.getWalletByUserId(subId);

    return { user, wallet };
  }
}
