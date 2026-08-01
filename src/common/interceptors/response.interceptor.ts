import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Request } from 'express';
import { PaginatedResult } from '../interfaces/paginated-result';

const MESSAGES_BY_METHOD: Record<string, string> = {
  GET: 'OK',
  POST: 'Creado',
  PATCH: 'Actualizado',
  PUT: 'Actualizado',
  DELETE: 'Eliminado',
};

function isPaginated(value: unknown): value is PaginatedResult<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    Array.isArray((value as { data: unknown }).data) &&
    'total' in value &&
    'page' in value &&
    'limit' in value
  );
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const message = MESSAGES_BY_METHOD[request.method] ?? 'OK';

    return next.handle().pipe(
      map((value: unknown) => {
        if (value instanceof StreamableFile) {
          return value;
        }
        if (isPaginated(value)) {
          const lastPage =
            value.total === 0 ? 0 : Math.ceil(value.total / value.limit);
          return {
            data: value.data,
            message,
            total: value.total,
            page: value.page,
            limit: value.limit,
            lastPage,
          };
        }
        return { data: value, message };
      }),
    );
  }
}
