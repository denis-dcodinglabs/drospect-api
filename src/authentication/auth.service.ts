/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "src/prisma.service";
import { UserService } from "src/users/user.service";
import { LoginDto } from "./dto/login-user.dto";
import * as bcrypt from "bcryptjs";
import { RegisterUserDto } from "./dto/register-user.dto";
import { User } from "src/users/user.model";
import { WalletService } from "src/wallet/wallet.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private jwtService: JwtService,
    private readonly userService: UserService,
    private readonly walletService: WalletService,
  ) {}

  async login(loginDto: LoginDto): Promise<any> {
    const { username, password } = loginDto;
    const user = await this.prismaService.user.findUnique({
      where: { username },
      include: { userRoles: { include: { role: true } } },
    });
    if (!username) {
      throw new HttpException("Username is required", HttpStatus.BAD_REQUEST);
    }

    if (!password) {
      throw new HttpException("Password is required", HttpStatus.BAD_REQUEST);
    }

    if (!user) {
      throw new UnauthorizedException("Invalid username or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid username or password");
    }

    const roles = user.userRoles.map((userRole) => userRole.role.id);

    const token = this.jwtService.sign({
      username: user.username,
      email: user.email,
      sub: user.id,
      roles: roles,
      role: user.userRoles[0].role.name,
    });
    const { password: _, ...userDetails } = user;

    const wallet = await this.walletService.getWalletByUserId(user.id);

    return { token, user: userDetails, wallet };
  }
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      // Verify the refresh token
      const payload = this.jwtService.verify(refreshToken);

      // Find the user associated with this token
      const user = await this.prismaService.user.findUnique({
        where: { id: payload.sub },
        include: { userRoles: { include: { role: true } } },
      });

      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      // Generate a new access token
      const roles = user.userRoles.map((userRole) => userRole.role.id);
      const newAccessToken = this.jwtService.sign(
        {
          username: user.username,
          email: user.email,
          sub: user.id,
          roles: roles,
        },
        // { expiresIn: process.env.JWT_EXPIRES_IN },
      ); // Set your preferred expiration time

      return { accessToken: newAccessToken };
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async register(
    createDto: RegisterUserDto,
    creatorId?: string,
  ): Promise<{ token: string; user: any }> {
    const { name, email, username, password, role = 1, credits } = createDto;

    if (!username) {
      throw new HttpException("Username is required", HttpStatus.BAD_REQUEST);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createUser = new User();
    createUser.firstName = name;
    createUser.email = email;
    createUser.username = username;
    createUser.password = hashedPassword;
    if (creatorId) {
      createUser.createdBy = creatorId;
    }

    const existingUser = await this.userService.getUserByUsername(username);
    if (existingUser) {
      throw new HttpException(
        {
          status: "Error",
          error: {
            type: "Error",
            message: ["Username already exists"],
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const userByEmail = await this.userService.getUserEmail(email);
    if (userByEmail) {
      throw new HttpException(
        {
          status: "Error",
          error: {
            type: "Error",
            message: ["Email already exists"],
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const newUser = await this.userService.createUser(createUser);

    // Assign the role to the user
    const roleRecord = await this.prismaService.role.findUnique({
      where: { id: role },
    });
    if (!roleRecord) {
      throw new NotFoundException("Role not found");
    }
    await this.prismaService.userRole.create({
      data: {
        user: { connect: { id: newUser.id } },
        role: { connect: { id: roleRecord.id } },
      },
    });

    // Create a wallet for the new user with specified credits
    await this.walletService.create({
      userId: newUser.id,
      credits: credits ?? 0, // Use nullish coalescing operator to default to 0
    });

    // Generate a token for the new user
    const token = this.jwtService.sign({
      username: newUser.username, // Use newUser instead of user
      email: newUser.email,
      sub: newUser.id,
    });

    const { password: _, ...userDetails } = newUser; // Use newUser here as well
    return { token, user: userDetails };
  }

  async impersonate({ id }: { id: string }): Promise<any> {
    const user = await this.prismaService.user.findUnique({
      where: { id: id },
      include: { userRoles: { include: { role: true } } }, // select only the fields you want to return
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    user.password = undefined;
    const roles = user.userRoles.map((userRole) => userRole.role.id);

    const token = this.jwtService.sign({
      username: user.username,
      sub: user.id,
      roles: roles,
    });

    return { token, user };
  }
}
