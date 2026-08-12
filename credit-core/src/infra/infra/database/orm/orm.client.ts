import { ConfigService, ConfigModule } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';

export default class TypeORMConfig {
  static getORMConfig(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432') || 5432,
      username: process.env.DB_USER || 'core-credit',
      password: process.env.DB_PASSWORD || 'orbe-ledger',
      database: process.env.DB_NAME || 'core-credit',
      synchronize: true,
      entities: [__dirname + '/../**/*.entity.{js,ts}'],
      migrations: [__dirname + '/../migrations/*.{js,ts}'],
      extra: {
        max: 20,
      },
      logging: process.env.DB_LOGGING === 'true',
      autoLoadEntities: true,
    };
  }
}

export const DBClientConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  useFactory: async (): Promise<TypeOrmModuleOptions> => TypeORMConfig.getORMConfig(),
  inject: [ConfigService],
};