import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch(PayloadTooLargeException, BadRequestException)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof PayloadTooLargeException) {
      response.status(400).json({
        message: 'El archivo supera el límite de 5 MB',
        error: 'Bad Request',
        statusCode: 400,
      });
      return;
    }

    const badRequest = exception as BadRequestException;
    response.status(400).json(badRequest.getResponse());
  }
}
