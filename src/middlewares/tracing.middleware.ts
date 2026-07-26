import { Injectable, NestMiddleware } from '@nestjs/common';
import { type Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class TracingMiddleware implements NestMiddleware {
  use(req: Request, _: Response, next: NextFunction) {
    const requestId = req.header('x-request-id');

    if (requestId) {
      req.hash = requestId;
      return next();
    }
    req.hash = randomUUID();
    next();
  }
}
