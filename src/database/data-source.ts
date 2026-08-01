import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './database.config';

// DataSource usado por el CLI de TypeORM (migraciones). El CLI corre fuera de
// NestJS, por eso lee las variables de entorno directamente con dotenv.
export const AppDataSource = new DataSource(
  buildDataSourceOptions(
    (key, defaultValue) => process.env[key] ?? defaultValue,
  ),
);
