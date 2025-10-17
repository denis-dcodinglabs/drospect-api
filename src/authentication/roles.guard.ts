import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get the roles from metadata (via @Roles decorator)
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    if (!requiredRoles) {
      return true; // If no roles are defined, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Should be set by the JwtAuthGuard

    if (!user || !user.role) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    // Check if the user has one of the required roles
    const hasRole =
      requiredRoles.includes(user.role) ||
      (Array.isArray(user.roles) &&
        user.roles.some((r) => requiredRoles.includes(r)));

    if (!hasRole) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return true; // User has the required role, access granted
  }
}
