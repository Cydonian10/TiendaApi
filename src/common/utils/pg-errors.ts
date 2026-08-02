import { QueryFailedError } from 'typeorm';

type PgErrorLike = { code?: string };

function pgErrorCode(error: unknown): string | undefined {
  if (error instanceof QueryFailedError) {
    const driver = (error as unknown as { driverError?: PgErrorLike })
      .driverError;
    return driver?.code ?? (error as unknown as PgErrorLike).code;
  }
  return (error as PgErrorLike)?.code;
}

export function isUniqueViolation(error: unknown): boolean {
  return pgErrorCode(error) === '23505';
}

export function isForeignKeyViolation(error: unknown): boolean {
  return pgErrorCode(error) === '23503';
}
