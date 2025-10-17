import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new ForbiddenException('No token provided');
    }

    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prismaService.user.findUnique({
        where: { id: payload.sub },
        include: { userRoles: { include: { role: true } } },
      });
      if (!user || !user.userRoles.some((userRole) => userRole.role.id === 2)) {
        throw new ForbiddenException(
          'You do not have permission to impersonate users',
        );
      }

      return true;
    } catch (error) {
      throw new ForbiddenException('Invalid token');
    }
  }
}
