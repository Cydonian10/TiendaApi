import { join } from 'path';
import { DataSourceOptions } from 'typeorm';

export type EnvGetter = (key: string, defaultValue: string) => string;

/**
 * Opciones de TypeORM compartidas entre:
 * - La aplicación NestJS (vía ConfigService en TypeOrmModule.forRootAsync)
 * - El CLI de migraciones (vía dotenv en data-source.ts)
 */
export const buildDataSourceOptions = (
  getEnv: EnvGetter,
): DataSourceOptions => ({
  type: 'postgres',
  host: getEnv('DB_HOST', 'localhost'),
  port: parseInt(getEnv('DB_PORT', '5432'), 10),
  username: getEnv('DB_USERNAME', 'postgres'),
  password: getEnv('DB_PASSWORD', 'postgres'),
  database: getEnv('DB_DATABASE', 'ferreteria'),
  entities: [join(__dirname, '/../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '/../database/migrations/*{.ts,.js}')],
  migrationsTableName: 'migrations',
  synchronize: false,
});
