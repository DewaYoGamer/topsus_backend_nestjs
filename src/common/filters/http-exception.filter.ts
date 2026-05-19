import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let detail: any = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        detail = body;
      } else if (typeof body === 'object' && body !== null) {
        // NestJS validation pipe returns {message: [...], error, statusCode}
        detail = (body as any).detail ?? (body as any).message ?? body;
      }
    }

    // If detail is an array of validation messages, wrap like FastAPI/Pydantic
    // FastAPI returns {"detail": "string"} for most errors
    // and {"detail": [{loc, msg, type}]} for validation
    res.status(status).json({ detail });
  }
}
