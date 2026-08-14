import { DataSource } from 'typeorm';
import { seed } from './seed';

async function runSeed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'orbe-ledger',
    password: 'orbe-ledger',
    database: 'credit-core',
    entities: ['src/infra/infra/database/entities/**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('📦 Database connected');

    await seed(dataSource);

    await dataSource.destroy();
    console.log('👋 Database disconnected');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

runSeed();
