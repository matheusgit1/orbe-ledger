import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ConflictException,
  GoneException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private logger = new Logger(GlobalExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const { hash } = request;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorType = 'InternalError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object') {
        message = (res as any).message || message;
      }

      if (exception instanceof BadRequestException) {
        errorType = 'BadRequest';
      } else if (exception instanceof NotFoundException) {
        errorType = 'NotFound';
      } else if (exception instanceof ConflictException) {
        errorType = 'Conflict';
      } else if (exception instanceof GoneException) {
        errorType = 'Gone';
      } else if (exception instanceof Error) {
        errorType = 'Error';
      } else {
        errorType = 'UnknownError';
      }
    }

    this.logger.error(`[${hash}] - global exception - ${errorType}: ${JSON.stringify(exception)}`);
    response.status(status).json({
      success: false,
      error: {
        type: errorType,
        message,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
      tracingId: hash,
    });
  }
}