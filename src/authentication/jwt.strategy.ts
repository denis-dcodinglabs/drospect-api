import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { PrismaService } from 'src/prisma.service';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prismaService: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  // Adjusted to return user with roles
  async validate(payload: { username: string; roles: string[]; role: string }) {
    const user = await this.prismaService.user.findUnique({
      where: {
        username: payload.username,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Merge user data with JWT payload, including roles
    return {
      ...user,
      roles: payload.roles, // Ensure roles are accessible in the guard
      role: payload.role, // For convenience, in case you need a single role
    };
  }
}
