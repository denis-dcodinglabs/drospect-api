/* eslint-disable no-useless-catch */
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { MailService } from "../helpers/mail-helper";
import { ProjectService } from "src/project/project.service";
import { UserService } from "src/users/user.service";
import { JwtAuthGuard } from "src/authentication/auth.guard";
import { getDecodedToken } from "src/decodedToken/getSubIdFromToken";
import { Request } from "express";
import { SendMailDto, SendClientEmailDto } from "./dto/contact.dto";
import { JwtOrApiKeyAuthGuard } from "src/authentication/jwt-or-apikey-auth.guard";

@Controller("/contactus")
export class ContactController {
  constructor(
    private readonly mailService: MailService,
    private readonly projectService: ProjectService,
    private readonly userService: UserService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true })) // Apply validation pipe
  async sendMail(@Body() sendMailDto: SendMailDto) {
    try {
      const { name, email, message } = sendMailDto;
      await this.mailService.sendMail(name, email, message);
      await this.mailService.returnMail(name, email);
      return {
        status: "Ok!",
        data: {
          message: "Email sent successfully",
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          status: "Error",
          error: {
            type: "MailError",
            message: error.message || "Failed to send email",
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post("/client")
  @UsePipes(new ValidationPipe({ transform: true })) // Apply validation pipe
  async sendEmailfromClient(
    @Body() sendClientEmailDto: SendClientEmailDto,
    @Req() request: Request,
  ) {
    try {
      const { subject, message } = sendClientEmailDto;
      const authorizationHeader = request.headers["authorization"];
      const user = getDecodedToken(authorizationHeader);

      if (typeof user === "object" && user !== null) {
        const { username, email } = user;
        await this.mailService.sendClientMail(
          username,
          email,
          subject,
          message,
        );
        await this.mailService.returnMail(username, email);
      } else {
        throw new HttpException(
          {
            status: "Error",
            error: {
              type: "InvalidUserError",
              message: "Invalid user type",
            },
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        status: "Ok!",
        data: {
          message: "Email sent successfully",
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          status: "Error",
          error: {
            type: "MailError",
            message: error.message || "There was a problem sending the email",
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtOrApiKeyAuthGuard)
  @Post("/inspection-complete")
  async mailImageInspectionComplete(@Body() body: { id: number }) {
    // const authorizationHeader = request.headers['authorization'];
    // const subId = getSubIdFromToken(authorizationHeader);

    const project = await this.projectService.getProjectById(body.id);
    // console.log(project);
    const userId = project.project.user.connect.id;
    // Retrieve user's email from userId
    const user = await this.userService.getUserById(userId);
    const userEmail = user.email;

    // Call mail service with the retrieved email
    await this.mailService.mailImageInspectionComplete(
      body.id,
      project.project.name,
      userEmail,
    );

    return {
      status: "Ok!",
      data: {
        message: "Inspection complete email sent successfully",
      },
    };
  }
}
