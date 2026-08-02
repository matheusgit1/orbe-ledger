import {
  AccountOwnerType,
  AccountStatus,
  AccountNature,
  NormalBalance,
} from '../infra/database/common/enums/account.enum';
import {
  LedgerCode,
  LedgerStatus,
} from '../infra/database/common/enums/ledger.enum';
import { OrganizationStatus } from '../infra/database/common/enums/organization.enum';
import { AccountType } from '../infra/database/entities/account-type.entity';
import { Account } from '../infra/database/entities/account.entity';
import { Currency } from '../infra/database/entities/currency.entity';
import { Ledger } from '../infra/database/entities/ledger.entity';
import { Organization } from '../infra/database/entities/organization.entity';
import { BalanceSnapshot } from '../infra/database/entities/balance-snapshot.entity';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { QueryRunner } from 'typeorm';

const clearDatabase = async (dataSource: DataSource) => {
  console.log('🧹 Clearing database...');

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
    console.log('✅ Database cleared successfully');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Error clearing database:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
};

const createCurrency = async (dataSource: DataSource) => {
  const currencyRepo = dataSource.getRepository(Currency);

  const currency = currencyRepo.create({
    code: 'BRL',
    numericCode: '986',
    symbol: 'R$',
    decimalPlaces: 2,
    metadata: { environment: 'development', type: 'seed' },
  });

  await currencyRepo.save(currency);
  console.log('✅ BRL Currency created');
  return currency;
};

const createOrganization = async (
  dataSource: DataSource,
  currency: Currency,
) => {
  const orgRepo = dataSource.getRepository(Organization);
  const organization = Organization.create({
    name: 'Orbe Ledger',
    legalName: 'Orbe Ledger Tecnologia Ltda',
    document: '12345678000199',
    status: OrganizationStatus.ACTIVE,
    timezone: 'America/Sao_Paulo',
    baseCurrencyId: currency.id,
    metadata: { environment: 'development' },
  });

  console.log('✅ Organization created');
  return await orgRepo.save(organization);
};

const createLedgers = async (
  dataSource: DataSource,
  organization: Organization,
) => {
  const ledgerRepo = dataSource.getRepository(Ledger);

  const ledgers = [
    {
      organizationId: organization.id,
      code: LedgerCode.MAIN,
      name: 'Ledger Principal',
      status: LedgerStatus.ACTIVE,
    },
    {
      organizationId: organization.id,
      code: LedgerCode.SETTLEMENT,
      name: 'Ledger de Liquidação',
      status: LedgerStatus.ACTIVE,
    },
    {
      organizationId: organization.id,
      code: LedgerCode.CARD,
      name: 'Ledger de Cartões',
      status: LedgerStatus.ACTIVE,
    },
    {
      organizationId: organization.id,
      code: LedgerCode.ESCROW,
      name: 'Ledger de Escrow',
      status: LedgerStatus.ACTIVE,
    },
    {
      organizationId: organization.id,
      code: LedgerCode.PIX,
      name: 'Ledger PIX',
      status: LedgerStatus.ACTIVE,
    },
    {
      organizationId: organization.id,
      code: LedgerCode.TREASURY,
      name: 'Ledger de Tesouraria',
      status: LedgerStatus.ACTIVE,
    },
  ];

  await Promise.all(
    ledgers.map((ledger) =>
      ledgerRepo.upsert(ledger, ['organizationId', 'code']),
    ),
  );

  const ledgerMain = await ledgerRepo.findOneOrFail({
    where: { organizationId: organization.id, code: LedgerCode.MAIN },
  });

  console.log('✅ All Ledgers created/updated');
  return ledgerMain;
};

const createAccountTypes = async (dataSource: DataSource) => {
  const accountTypeRepo = dataSource.getRepository(AccountType);

  const accountTypes = [
    AccountType.create(
      'ASSET',
      'Ativo',
      AccountNature.ASSET,
      NormalBalance.DEBIT,
      undefined,
      0,
    ),
    AccountType.create(
      'LIABILITY',
      'Passivo',
      AccountNature.LIABILITY,
      NormalBalance.CREDIT,
      undefined,
      0,
    ),
    AccountType.create(
      'EQUITY',
      'Patrimônio Líquido',
      AccountNature.EQUITY,
      NormalBalance.CREDIT,
      undefined,
      0,
    ),
    AccountType.create(
      'REVENUE',
      'Receita',
      AccountNature.REVENUE,
      NormalBalance.CREDIT,
      undefined,
      0,
    ),
    AccountType.create(
      'EXPENSE',
      'Despesa',
      AccountNature.EXPENSE,
      NormalBalance.DEBIT,
      undefined,
      0,
    ),
  ];

  await Promise.all(
    accountTypes.map((accountType) =>
      accountTypeRepo.upsert(accountType, ['code']),
    ),
  );

  console.log('✅ All Account Types created/updated');
};

const createTestAccounts = async (
  dataSource: DataSource,
  ledgerMain: Ledger,
  assetAccountType: AccountType,
  brlCurrency: Currency,
) => {
  const accountRepo = dataSource.getRepository(Account);
  const balanceSnapshotRepo = dataSource.getRepository(BalanceSnapshot);

  // Conta Pagador (Cliente)
  let payerAccount = await accountRepo.findOne({
    where: { ledgerId: ledgerMain.id, code: 'PAYER-001' },
  });
  if (!payerAccount) {
    payerAccount = accountRepo.create({
      ledgerId: ledgerMain.id,
      accountTypeId: assetAccountType.id,
      ownerId: uuidv4(),
      ownerType: AccountOwnerType.CUSTOMER,
      code: 'PAYER-001',
      name: 'João Silva (Pagador)',
      description: 'Conta do cliente pagador para teste PIX',
      currencyId: brlCurrency.id,
      status: AccountStatus.ACTIVE,
      allowDebit: true,
      allowCredit: true,
      allowNegative: false,
      isSystem: false,
      isLeaf: true,
      metadata: { customerId: 'PAYER-001', document: '123.456.789-00' },
    });
    await accountRepo.save(payerAccount);
    console.log('✅ Payer account created');

    // Criar saldo inicial
    const payerBalance = BalanceSnapshot.createInitial(
      payerAccount.id,
      brlCurrency.id,
    );
    payerBalance.available = 10000;
    payerBalance.book = 10000;
    await balanceSnapshotRepo.save(payerBalance);
    console.log('  💰 Payer initial balance: R$ 10.000,00');
  }

  // Conta Destinatário (Cliente)
  let receiverAccount = await accountRepo.findOne({
    where: { ledgerId: ledgerMain.id, code: 'RECEIVER-001' },
  });
  if (!receiverAccount) {
    receiverAccount = accountRepo.create({
      ledgerId: ledgerMain.id,
      accountTypeId: assetAccountType.id,
      ownerId: uuidv4(),
      ownerType: AccountOwnerType.CUSTOMER,
      code: 'RECEIVER-001',
      name: 'Maria Santos (Destinatário)',
      description: 'Conta do cliente destinatário para teste PIX',
      currencyId: brlCurrency.id,
      status: AccountStatus.ACTIVE,
      allowDebit: true,
      allowCredit: true,
      allowNegative: false,
      isSystem: false,
      isLeaf: true,
      metadata: { customerId: 'RECEIVER-001', document: '987.654.321-00' },
    });
    await accountRepo.save(receiverAccount);
    console.log('✅ Receiver account created');

    // Criar saldo inicial
    const receiverBalance = BalanceSnapshot.createInitial(
      receiverAccount.id,
      brlCurrency.id,
    );
    receiverBalance.available = 5000;
    receiverBalance.book = 5000;
    await balanceSnapshotRepo.save(receiverBalance);
    console.log('  💰 Receiver initial balance: R$ 5.000,00');
  }

  return { payerAccount, receiverAccount };
};

const createReserveAccounts = async (
  dataSource: DataSource,
  ledgerMain: Ledger,
  assetAccountType: AccountType,
  brlCurrency: Currency,
  organization: Organization,
) => {
  const accountRepo = dataSource.getRepository(Account);
  const balanceSnapshotRepo = dataSource.getRepository(BalanceSnapshot);

  const reserveAccounts = [
    {
      code: 'RESERVE-PAYER',
      name: 'Reserva PSP Pagador',
      description: 'Conta de reserva do PSP pagador para liquidação SPI',
    },
    {
      code: 'RESERVE-SPI',
      name: 'Reserva SPI',
      description: 'Conta transitória do SPI para liquidação',
    },
    {
      code: 'RESERVE-RECEIVER',
      name: 'Reserva PSP Recebedor',
      description: 'Conta de reserva do PSP recebedor para liquidação SPI',
    },
    {
      code: 'PIX-OUT-PENDING',
      name: 'PIX OUT Pending',
      description: 'Cliente debitado, aguardando envio ao SPI',
    },
    {
      code: 'PIX-OUT-SETTLEMENT',
      name: 'PIX OUT Settlement',
      description: 'Em liquidação no SPI',
    },
    {
      code: 'PIX-IN-SETTLEMENT',
      name: 'PIX IN Settlement',
      description: 'Liquidação recebida do SPI',
    },
    {
      code: 'PIX-IN-PENDING',
      name: 'PIX IN Pending',
      description: 'Aguardando crédito ao cliente',
    },
    {
      code: 'SPI-RESERVE',
      name: 'SPI Reserve',
      description: 'Conta de liquidação da instituição',
    },
  ];

  const reserveAccountIds: Record<string, string> = {};

  for (const reserveData of reserveAccounts) {
    let reserveAccount = await accountRepo.findOne({
      where: { ledgerId: ledgerMain.id, code: reserveData.code },
    });
    if (!reserveAccount) {
      reserveAccount = accountRepo.create({
        ledgerId: ledgerMain.id,
        accountTypeId: assetAccountType.id,
        ownerId: organization.id,
        ownerType: AccountOwnerType.SYSTEM,
        code: reserveData.code,
        name: reserveData.name,
        description: reserveData.description,
        currencyId: brlCurrency.id,
        status: AccountStatus.ACTIVE,
        allowDebit: true,
        allowCredit: true,
        allowNegative: true,
        isSystem: true,
        isLeaf: true,
        metadata: { type: 'reserve_account' },
      });
      await accountRepo.save(reserveAccount);
      console.log(`✅ ${reserveData.name} created`);

      // Criar saldo inicial
      const reserveBalance = BalanceSnapshot.createInitial(
        reserveAccount.id,
        brlCurrency.id,
      );
      reserveBalance.available = 1000000;
      reserveBalance.book = 1000000;
      await balanceSnapshotRepo.save(reserveBalance);
      console.log(`  💰 ${reserveData.name} initial balance: R$ 1.000.000,00`);
    }
    reserveAccountIds[reserveData.code] = reserveAccount.id;
  }

  return reserveAccountIds;
};

export async function seedDatabase(dataSource: DataSource) {
  await clearDatabase(dataSource);

  console.log('🌱 Starting database seed...');

  const brlCurrency = await createCurrency(dataSource);

  const organization = await createOrganization(dataSource, brlCurrency);

  const ledgerMain = await createLedgers(dataSource, organization);

  await createAccountTypes(dataSource);

  const accountTypeRepo = dataSource.getRepository(AccountType);
  const assetAccountType = await accountTypeRepo.findOneOrFail({
    where: { code: 'ASSET' },
  });

  const { payerAccount, receiverAccount } = await createTestAccounts(
    dataSource,
    ledgerMain,
    assetAccountType,
    brlCurrency,
  );

  const reserveAccountIds = await createReserveAccounts(
    dataSource,
    ledgerMain,
    assetAccountType,
    brlCurrency,
    organization,
  );

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Account IDs for PIX Transfer Test:');
  console.log(`  Payer Account ID: ${payerAccount.id}`);
  console.log(`  Receiver Account ID: ${receiverAccount.id}`);
  console.log(`  Payer Reserve ID: ${reserveAccountIds['RESERVE-PAYER']}`);
  console.log(`  SPI Reserve ID: ${reserveAccountIds['RESERVE-SPI']}`);
  console.log(
    `  Receiver Reserve ID: ${reserveAccountIds['RESERVE-RECEIVER']}`,
  );
  console.log(`  Ledger ID: ${ledgerMain.id}`);
  console.log(`  Currency ID: ${brlCurrency.id}`);
}
