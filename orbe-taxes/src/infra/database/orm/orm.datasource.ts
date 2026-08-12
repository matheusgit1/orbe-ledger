import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432') || 5432,
  username: process.env.DB_USER || 'orbe-taxes',
  password: process.env.DB_PASSWORD || 'orbe-taxes',
  database: process.env.DB_NAME || 'orbe-taxes',
  synchronize: true,
  entities: [__dirname + '/../**/*.entity.{js,ts}'],
  migrations: ['src/migrations/*.{js,ts}'],
  extra: {
    max: 20,
  },
  logging: process.env.DB_LOGGING === 'true',
});
