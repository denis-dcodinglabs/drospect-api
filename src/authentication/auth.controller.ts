/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  Get,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login-user.dto";
import { Request, Response } from "express";
import { RegisterUserDto } from "./dto/register-user.dto";
import { JwtAuthGuard } from "./auth.guard";
import { JwtService } from "@nestjs/jwt";

@Controller("/auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post("/login")
  async login(
    @Req() request: Request,
    @Res() response: Response,
    @Body() loginDto: LoginDto,
  ): Promise<any> {
    try {
      const result = await this.authService.login(loginDto);
      return response.status(200).json({
        status: "Ok!",
        data: {
          message: "Successfully logged in!",
          user: result.user, // Inclußde user details
          wallet: result.wallet,
          token: result.token, // Include the token
        },
      });
    } catch (err) {
      return response.status(400).json({
        status: "Error",
        error: {
          message: "Invalid username or password!",
        },
      });
    }
  }
  @Get("/refresh")
  @UseGuards(JwtAuthGuard)
  async refreshToken(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<any> {
    try {
      const token = request.headers.authorization?.split(" ")[1];
      const result = await this.authService.refreshToken(token);
      return response.status(200).json({
        status: "Ok!",
        data: {
          message: "Token refreshed successfully!",
          token: result.accessToken,
        },
      });
    } catch (err) {
      return response.status(401).json({
        status: "Error",
        message: "Invalid refresh token",
      });
    }
  }

  @Post("/register")
  async register(
    @Req() request: Request,
    @Res() response: Response,
    @Body() registerDto: RegisterUserDto,
  ): Promise<any> {
    try {
      // Get the creator's ID from the authorization header if it exists
      const authHeader = request.headers.authorization;
      let creatorId;
      if (authHeader) {
        const token = authHeader.split(" ")[1];
        const decoded = this.jwtService.decode(token) as any;
        creatorId = decoded?.sub;
      }

      const result = await this.authService.register(registerDto, creatorId);
      return response.status(200).json({
        status: "Ok!",
        data: {
          message: "Successfully register user!",
          result: result,
        },
      });
    } catch (err) {
      if (err.response) {
        return response.status(err.status || 400).json(err.response);
      }

      return response.status(err.status || 400).json({
        status: "Error",
        error: {
          type: "Error",
          message: [err.message || "Failed to register user!"],
        },
      });
    }
  }

  @Post("/impersonate")
  async impersonate(
    @Req() request: Request,
    @Res() response: Response,
    @Body() body: { id: string },
  ): Promise<any> {
    try {
      const result = await this.authService.impersonate(body);
      return response.status(200).json({
        status: "Ok!",
        message: "Successfully login!",
        data: result,
      });
    } catch (err) {
      return response.status(400).json({
        status: response.status,
        message: err.message || "Invalid username or password!",
      });
    }
  }
}
