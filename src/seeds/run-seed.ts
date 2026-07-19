
// import { DataSource } from 'typeorm';
// import { seedDatabase } from './seed';

// async function runSeed() {
//   const dataSource = new DataSource({
//     type: 'postgres',
//     host: 'localhost',
//     port: 5432,
//     username: 'orbe-ledger',
//     password: 'orbe-ledger',
//     database: 'main-ledger',
//     entities: ['src/infra/database/entities/**/*.ts'],
//     migrations: ['src/migrations/**/*.ts'],
//     synchronize: false,
//     logging: true,
//   });
  
//   try {
//     await dataSource.initialize();
//     console.log('📦 Database connected');
    
//     await seedDatabase(dataSource);
    
//     await dataSource.destroy();
//     console.log('👋 Database disconnected');
//   } catch (error) {
//     console.error('❌ Seed failed:', error);
//     process.exit(1);
//   }
// }

// runSeed();