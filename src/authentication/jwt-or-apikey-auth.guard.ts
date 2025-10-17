import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class JwtOrApiKeyAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (apiKey && apiKey === process.env.API_KEY) {
      return true;
    }

    return super.canActivate(context) as Promise<boolean>;
  }

  handleRequest(err, user, info, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (apiKey && apiKey === process.env.API_KEY) {
      return true;
    }

    if (err || !user || user.isDeleted === true) {
      throw err || new UnauthorizedException();
    }

    return user;
  }
}
