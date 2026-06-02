// this file is used to catch all unhandled 
// exceptions and return a consistent error response format


import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const res = ctx.getResponse();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = isHttp ? exception.getResponse() : null;

    // Nest sometimes returns message as array (validation errors)
    const message =
      typeof responseBody === 'string'
        ? responseBody
        : (responseBody as any)?.message ?? 'Internal server error';

    const error =
      typeof responseBody === 'object' ? (responseBody as any)?.error : undefined;

    res.status(status).json({
      statusCode: status,
      message,
      error,
      path: (req as any).url,
      timestamp: new Date().toISOString(),
      requestId: (req as any).requestId,
    });
  }
}