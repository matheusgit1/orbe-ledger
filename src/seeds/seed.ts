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

export async function seedDatabase(dataSource: DataSource) {
  console.log('🌱 Starting database seed...');

  const currencyRepo = dataSource.getRepository(Currency);
  let brlCurrency = await currencyRepo.findOne({ where: { code: 'BRL' } });

  if (!brlCurrency) {
    brlCurrency = currencyRepo.create({
      code: 'BRL',
      numericCode: '986',
      symbol: 'R$',
      decimalPlaces: 2,
    });
    await currencyRepo.save(brlCurrency);
    console.log('✅ BRL Currency created');
  }

  // 2. Criar Organization
  const orgRepo = dataSource.getRepository(Organization);
  let organization = await orgRepo.findOne({
    where: { document: '12345678000199' },
  });

  if (!organization) {
    organization = new Organization();
    organization.name = 'Orbe Ledger';
    organization.legalName = 'Orbe Ledger Tecnologia Ltda';
    organization.document = '12345678000199';
    organization.status = OrganizationStatus.ACTIVE;
    organization.timezone = 'America/Sao_Paulo';
    organization.baseCurrencyId = brlCurrency.id;
    organization.metadata = { environment: 'development' };
    await orgRepo.save(organization);
    console.log('✅ Organization created');
  }

  // 3. Criar Ledger
  const ledgerRepo = dataSource.getRepository(Ledger);
  let ledger = await ledgerRepo.findOne({
    where: { organizationId: organization.id, code: LedgerCode.MAIN },
  });

  if (!ledger) {
    ledger = new Ledger();
    ledger.organizationId = organization.id;
    ledger.code = LedgerCode.MAIN;
    ledger.name = 'Ledger Principal';
    ledger.description = 'Ledger principal para operações';
    ledger.status = LedgerStatus.ACTIVE;
    await ledgerRepo.save(ledger);
    console.log('✅ Ledger created');
  }

  // 4. Criar Account Types
  const accountTypeRepo = dataSource.getRepository(AccountType);
  let assetAccountType = await accountTypeRepo.findOne({
    where: { code: 'ASSET' },
  });

  if (!assetAccountType) {
    assetAccountType = AccountType.create(
      'ASSET',
      'Ativo',
      AccountNature.ASSET,
      NormalBalance.DEBIT,
      undefined,
      0,
    );
    await accountTypeRepo.save(assetAccountType);
    console.log('✅ Account Type ASSET created');
  }

  // 5. Criar Accounts para teste PIX
  const accountRepo = dataSource.getRepository(Account);
  const balanceSnapshotRepo = dataSource.getRepository(BalanceSnapshot);

  // Conta Pagador (Cliente)
  let payerAccount = await accountRepo.findOne({
    where: { ledgerId: ledger.id, code: 'PAYER-001' },
  });
  if (!payerAccount) {
    payerAccount = accountRepo.create({
      ledgerId: ledger.id,
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
    where: { ledgerId: ledger.id, code: 'RECEIVER-001' },
  });
  if (!receiverAccount) {
    receiverAccount = accountRepo.create({
      ledgerId: ledger.id,
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

  // Contas de Reserva do Sistema (para fluxo PIX)
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
  ];

  const reserveAccountIds: Record<string, string> = {};

  for (const reserveData of reserveAccounts) {
    let reserveAccount = await accountRepo.findOne({
      where: { ledgerId: ledger.id, code: reserveData.code },
    });
    if (!reserveAccount) {
      reserveAccount = accountRepo.create({
        ledgerId: ledger.id,
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

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Account IDs for PIX Transfer Test:');
  console.log(`  Payer Account ID: ${payerAccount.id}`);
  console.log(`  Receiver Account ID: ${receiverAccount.id}`);
  console.log(`  Payer Reserve ID: ${reserveAccountIds['RESERVE-PAYER']}`);
  console.log(`  SPI Reserve ID: ${reserveAccountIds['RESERVE-SPI']}`);
  console.log(
    `  Receiver Reserve ID: ${reserveAccountIds['RESERVE-RECEIVER']}`,
  );
  console.log(`  Ledger ID: ${ledger.id}`);
  console.log(`  Currency ID: ${brlCurrency.id}`);
}
