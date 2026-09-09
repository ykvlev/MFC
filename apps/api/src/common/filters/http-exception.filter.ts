import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/** Единый формат ошибок — ТЗ 11.7. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Внутренняя ошибка сервера';
    let details: unknown = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        code = (b.code as string) ?? mapStatusToCode(status);
        message = (b.message as string) ?? exception.message;
        details = b.details ?? null;
      } else {
        code = mapStatusToCode(status);
        message = String(body);
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    if (status >= 500 && process.env.NODE_ENV === 'production') {
      message = 'Внутренняя ошибка сервера';
      details = null;
    }

    res.status(status).json({
      error: { code, message, details },
      requestId: req.requestId ?? null,
    });
  }
}

function mapStatusToCode(status: number): string {
  const map: Record<number, string> = {
    400: 'VALIDATION_ERROR',
    401: 'UNAUTHORIZED',
    403: 'ACCESS_DENIED',
    404: 'NOT_FOUND',
    409: 'INVALID_TRANSITION',
    413: 'FILE_TOO_LARGE',
    415: 'UNSUPPORTED_FILE_TYPE',
    429: 'RATE_LIMITED',
  };
  return map[status] ?? 'INTERNAL_ERROR';
}
