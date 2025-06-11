import { DataSource, DataSourceOptions } from 'typeorm';
import { databaseConfig } from '../config/database.config';

// Data source configuration for running migrations
export const AppDataSource = new DataSource({
  ...databaseConfig,
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false, // Disable for migrations
} as DataSourceOptions);

// Initialize data source
export const initializeDataSource = async (): Promise<DataSource> => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  return AppDataSource;
};
