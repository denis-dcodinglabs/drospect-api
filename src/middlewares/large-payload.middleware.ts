// large-payload.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import * as bodyParser from 'body-parser';

@Injectable()
export class LargePayloadMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    if (
      req.url.startsWith('/api/projects/upload') ||
      req.url.startsWith('/panels')
    ) {
      return bodyParser.json({ limit: '5gb' })(req, res, next);
    }
    next();
  }
}
