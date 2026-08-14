import { DataSource } from 'typeorm';
import { CreditAccount } from '../infra/infra/database/entities/credit-account.entity';
import { CreditProduct } from '../infra/infra/database/entities/credit-product.entity';
import { CreditLimit } from '../infra/infra/database/entities/credit-limit.entity';
import { CreditAccountStatus } from '../infra/infra/database/common/enums/credit-account.enum';
import { CreditProductStatus } from '../infra/infra/database/common/enums/credit-products.enum';
import { CreditLimitStatus } from '../infra/infra/database/common/enums/credit-limits.enum';

const clearDatabase = async (dataSource: DataSource) => {
  console.log('🧹 Clearing credit database...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Get all table names from public schema
    const tables = await queryRunner.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `);

    // Truncate all tables with CASCADE to handle foreign key constraints
    if (tables.length > 0) {
      const tableNames = tables.map((t: any) => `"${t.table_name}"`).join(', ');
      await queryRunner.query(`TRUNCATE TABLE ${tableNames} CASCADE`);
    }

    await queryRunner.commitTransaction();
    console.log('✅ Credit database cleared successfully');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Error clearing credit database:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
};

const createCreditProducts = async (dataSource: DataSource) => {
  const productRepo = dataSource.getRepository(CreditProduct);

  const products = [
    {
      code: 'CREDIT_CARD',
      name: 'Cartão de Crédito',
      description: 'Produto de cartão de crédito para compras parceladas',
      currencyCode: 'BRL',
      minLimit: 200,
      maxLimit: 50000,
      billingCycleDays: 30,
      paymentTermDays: 30,
      status: CreditProductStatus.ACTIVE,
      metadata: { type: 'card', defaultLimit: 200 },
      isActive: true,
    },
    {
      code: 'PERSONAL_LOAN',
      name: 'Empréstimo Pessoal',
      description: 'Empréstimo pessoal com parcelas fixas',
      currencyCode: 'BRL',
      minLimit: 500,
      maxLimit: 100000,
      billingCycleDays: 30,
      paymentTermDays: 30,
      status: CreditProductStatus.ACTIVE,
      metadata: { type: 'loan', defaultLimit: 200 },
      isActive: true,
    },
    {
      code: 'CONSIGNMENT_LOAN',
      name: 'Empréstimo Consignado',
      description: 'Empréstimo consignado com desconto em folha',
      currencyCode: 'BRL',
      minLimit: 1000,
      maxLimit: 200000,
      billingCycleDays: 30,
      paymentTermDays: 30,
      status: CreditProductStatus.ACTIVE,
      metadata: { type: 'consignment', defaultLimit: 200 },
      isActive: true,
    },
    {
      code: 'OVERDRAFT',
      name: 'Cheque Especial',
      description: 'Limite de crédito para emergências',
      currencyCode: 'BRL',
      minLimit: 100,
      maxLimit: 10000,
      billingCycleDays: 30,
      paymentTermDays: 30,
      status: CreditProductStatus.ACTIVE,
      metadata: { type: 'overdraft', defaultLimit: 200 },
      isActive: true,
    },
  ];

  const createdProducts = await Promise.all(
    products.map((product) => productRepo.save(productRepo.create(product))),
  );

  console.log('✅ Credit products created:', createdProducts.length);
  return createdProducts;
};

const createCreditAccount = async (
  dataSource: DataSource,
  products: CreditProduct[],
) => {
  const accountRepo = dataSource.getRepository(CreditAccount);
  const limitRepo = dataSource.getRepository(CreditLimit);

  const accountId = '3838a7d2-643f-4f1d-8ccf-a7d4306b90d0';

  // Check if account already exists
  let creditAccount = await accountRepo.findOne({
    where: { accountId },
    relations: { creditProducts: true },
  });

  if (!creditAccount) {
    creditAccount = accountRepo.create({
      accountId,
      status: CreditAccountStatus.ACTIVE,
      openedAt: new Date(),
      metadata: { environment: 'development', type: 'seed' },
    });
    await accountRepo.save(creditAccount);
    console.log('✅ Credit account created with ID:', accountId);
  } else {
    console.log('ℹ️  Credit account already exists with ID:', accountId);
  }

  // Link the account to all products
  if (!creditAccount.creditProducts) {
    creditAccount.creditProducts = [];
  }

  for (const product of products) {
    const hasProduct = creditAccount.creditProducts.some(
      (p) => p.code === product.code,
    );

    if (!hasProduct) {
      creditAccount.creditProducts.push(product);
      console.log(`✅ Credit account linked to ${product.name} product`);
    } else {
      console.log(
        `ℹ️  Credit account already linked to ${product.name} product`,
      );
    }

    // Create credit limit for each product
    let creditLimit = await limitRepo.findOne({
      where: {
        creditAccountId: creditAccount.id,
        creditProductId: product.id,
      },
    });

    if (!creditLimit) {
      // Custom limit: 1000 for credit card, default for others
      const limitAmount = product.code === 'CREDIT_CARD' ? 1000 : 200;

      creditLimit = limitRepo.create({
        creditAccountId: creditAccount.id,
        creditProductId: product.id,
        limitAmount,
        usedAmount: 0,
        availableAmount: limitAmount,
        status: CreditLimitStatus.ACTIVE,
        validFrom: new Date(),
        validTo: undefined,
        metadata: {
          customLimit: product.code === 'CREDIT_CARD',
          defaultLimit: 200,
          productCode: product.code,
        },
      });
      await limitRepo.save(creditLimit);
      console.log(
        `✅ Credit limit created: R$ ${limitAmount.toFixed(2)} for ${product.name}`,
      );
    } else {
      console.log(
        `ℹ️  Credit limit already exists for ${product.name} product`,
      );
    }
  }

  await accountRepo.save(creditAccount);

  return creditAccount;
};

const seed = async (dataSource: DataSource) => {
  console.log('🌱 Starting credit-core seed...');

  console.log('✅ Database connection established');

  // Clear database
  await clearDatabase(dataSource);

  // Create credit products
  const products = await createCreditProducts(dataSource);

  // Create credit account and link to all products with their respective limits
  await createCreditAccount(dataSource, products);

  console.log('🎉 Credit-core seed completed successfully!');
};

export { seed };
