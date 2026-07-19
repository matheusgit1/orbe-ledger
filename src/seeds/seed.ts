// import { AccountNature, AccountOwnerType, AccountStatus, NormalBalance } from '../infra/database/common/enums/account.enum';
// import { CurrencyCode } from '../infra/database/common/enums/currency.enum';
// import { LedgerCode, LedgerStatus } from '../infra/database/common/enums/ledger.enum';
// import { OrganizationStatus } from '../infra/database/common/enums/organization.enum';
// import { AccountType } from '../infra/database/entities/account-type.entity';
// import { Account } from '../infra/database/entities/account.entity';
// import { Currency } from '../infra/database/entities/currency.entity';
// import { Ledger } from '../infra/database/entities/ledger.entity';
// import { Organization } from '../infra/database/entities/organization.entity';
// import { DataSource } from 'typeorm';


// export async function seedDatabase(dataSource: DataSource) {
//   console.log('🌱 Starting database seed...');

//   // 1. Criar Organization
//   const orgRepo = dataSource.getRepository(Organization);
//   let organization = await orgRepo.findOne({ where: { document: '12345678000199' } });
  
//   if (!organization) {
//     organization = orgRepo.create({
//       name: 'Orbe Ledger',
//       legalName: 'Orbe Ledger Tecnologia Ltda',
//       document: '12345678000199',
//       status: OrganizationStatus.ACTIVE,
//       timezone: 'America/Sao_Paulo',
//       baseCurrency: 'BRL',
//       metadata: { environment: 'development' },
//     });
//     await orgRepo.save(organization);
//     console.log('✅ Organization created');
//   }

//   // 2. Criar Currencies
//   const currencyRepo = dataSource.getRepository(Currency);
//   const currencies = [
//     { code: CurrencyCode.BRL, numericCode: '986', symbol: 'R$', decimalPlaces: 2 },
//     { code: CurrencyCode.USD, numericCode: '840', symbol: 'US$', decimalPlaces: 2 },
//     { code: CurrencyCode.EUR, numericCode: '978', symbol: '€', decimalPlaces: 2 },
//   ];

//   for (const currencyData of currencies) {
//     let currency = await currencyRepo.findOne({ where: { code: currencyData.code } });
//     if (!currency) {
//       currency = currencyRepo.create(currencyData);
//       await currencyRepo.save(currency);
//     }
//   }
//   console.log('✅ Currencies created');

//   // 3. Criar Ledger
//   const ledgerRepo = dataSource.getRepository(Ledger);
//   let ledger = await ledgerRepo.findOne({ 
//     where: { organizationId: organization.id, code: LedgerCode.MAIN } 
//   });

//   if (!ledger) {
//     ledger = ledgerRepo.create({
//       organizationId: organization.id,
//       code: LedgerCode.MAIN,
//       name: 'Ledger Principal',
//       description: 'Ledger principal para operações',
//       status: LedgerStatus.ACTIVE,
//     });
//     await ledgerRepo.save(ledger);
//     console.log('✅ Ledger created');
//   }

//   // 4. Criar Account Types
//   const accountTypeRepo = dataSource.getRepository(AccountType);
//   const accountTypes = [
//     { code: '1', name: 'ATIVO', nature: AccountNature.ASSET, normalBalance: NormalBalance.DEBIT, level: 0 },
//     { code: '1.1', name: 'CAIXA', nature: AccountNature.ASSET, normalBalance: NormalBalance.DEBIT, level: 1, parentCode: '1' },
//     { code: '1.2', name: 'BANCOS', nature: AccountNature.ASSET, normalBalance: NormalBalance.DEBIT, level: 1, parentCode: '1' },
//     { code: '2', name: 'PASSIVO', nature: AccountNature.LIABILITY, normalBalance: NormalBalance.CREDIT, level: 0 },
//     { code: '2.1', name: 'FORNECEDORES', nature: AccountNature.LIABILITY, normalBalance: NormalBalance.CREDIT, level: 1, parentCode: '2' },
//     { code: '3', name: 'PATRIMÔNIO LÍQUIDO', nature: AccountNature.EQUITY, normalBalance: NormalBalance.CREDIT, level: 0 },
//     { code: '4', name: 'RECEITA', nature: AccountNature.REVENUE, normalBalance: NormalBalance.CREDIT, level: 0 },
//     { code: '5', name: 'DESPESA', nature: AccountNature.EXPENSE, normalBalance: NormalBalance.DEBIT, level: 0 },
//   ];

//   for (const typeData of accountTypes) {
//     let accountType = await accountTypeRepo.findOne({ where: { code: typeData.code } });
//     if (!accountType) {
//       const parent = typeData.parentCode 
//         ? await accountTypeRepo.findOne({ where: { code: typeData.parentCode } })
//         : null;
      
//       accountType = accountTypeRepo.create({
//         code: typeData.code,
//         name: typeData.name,
//         nature: typeData.nature,
//         normalBalance: typeData.normalBalance,
//         level: typeData.level,
//         parentId: parent?.id || null,
//         allowPosting: true,
//       });
//       await accountTypeRepo.save(accountType);
//     }
//   }
//   console.log('✅ Account Types created');

//   // 5. Criar Accounts de exemplo
//   const accountRepo = dataSource.getRepository(Account);
//   const brlCurrency = await currencyRepo.findOne({ where: { code: CurrencyCode.BRL } });
//   const accountTypeCash = await accountTypeRepo.findOne({ where: { code: '1.1' } });
//   const accountTypeBank = await accountTypeRepo.findOne({ where: { code: '1.2' } });

//   if (brlCurrency && accountTypeCash && accountTypeBank) {
//     // Conta Caixa
//     let cashAccount = await accountRepo.findOne({ 
//       where: { ledgerId: ledger.id, code: 'CASH-001' } 
//     });
//     if (!cashAccount) {
//       cashAccount = accountRepo.create({
//         ledgerId: ledger.id,
//         accountTypeId: accountTypeCash.id,
//         ownerId: organization.id,
//         ownerType: AccountOwnerType.SYSTEM,
//         code: 'CASH-001',
//         name: 'Caixa Principal',
//         description: 'Caixa principal da organização',
//         currencyId: brlCurrency.id,
//         status: AccountStatus.ACTIVE,
//         allowDebit: true,
//         allowCredit: true,
//         allowNegative: false,
//         isSystem: true,
//         isLeaf: true,
//         metadata: { type: 'main_cash' },
//       });
//       await accountRepo.save(cashAccount);
//     }

//     // Conta Banco
//     let bankAccount = await accountRepo.findOne({ 
//       where: { ledgerId: ledger.id, code: 'BANK-001' } 
//     });
//     if (!bankAccount) {
//       bankAccount = accountRepo.create({
//         ledgerId: ledger.id,
//         accountTypeId: accountTypeBank.id,
//         ownerId: organization.id,
//         ownerType: AccountOwnerType.SYSTEM,
//         code: 'BANK-001',
//         name: 'Banco Principal',
//         description: 'Conta bancária principal',
//         currencyId: brlCurrency.id,
//         status: AccountStatus.ACTIVE,
//         allowDebit: true,
//         allowCredit: true,
//         allowNegative: false,
//         isSystem: true,
//         isLeaf: true,
//         metadata: { bank: 'Banco do Brasil', agency: '0001', account: '12345-6' },
//       });
//       await accountRepo.save(bankAccount);
//     }

//     // Conta Cliente
//     let customerAccount = await accountRepo.findOne({ 
//       where: { ledgerId: ledger.id, code: 'CUST-001' } 
//     });
//     if (!customerAccount) {
//       customerAccount = accountRepo.create({
//         ledgerId: ledger.id,
//         accountTypeId: accountTypeBank.id,
//         ownerId: 'c123e456-7e89-12d3-a456-426614174000', // UUID fictício
//         ownerType: AccountOwnerType.CUSTOMER,
//         code: 'CUST-001',
//         name: 'Cliente Exemplo',
//         description: 'Conta do cliente exemplo',
//         currencyId: brlCurrency.id,
//         status: AccountStatus.ACTIVE,
//         allowDebit: true,
//         allowCredit: true,
//         allowNegative: false,
//         isSystem: false,
//         isLeaf: true,
//         metadata: { customerId: 'CUST-001', document: '123.456.789-00' },
//       });
//       await accountRepo.save(customerAccount);
//     }

//     // 6. Criar saldo inicial para as contas
// console.log('\n💰 Creating initial balances...');

// // Função para criar saldo inicial via Journal
// async function createInitialBalance(
//   accountId: string,
//   amount: number,
//   ledgerId: string,
//   currencyId: string
// ) {
//   // Verifica se já tem saldo
//   const result = await dataSource.query(
//     `SELECT * FROM get_account_balance_at_time($1, $2)`,
//     [accountId, new Date()]
//   );
  
//   const currentBalance = parseFloat(result[0]?.balance || '0');
  
//   if (currentBalance === 0 && amount > 0) {
//     // Cria journal de saldo inicial
//     const journalRepo = dataSource.getRepository('Journal');
//     const entryRepo = dataSource.getRepository('Entry');
    
//     const journal = journalRepo.create({
//       ledgerId,
//       journalNumber: `INITIAL-${Date.now()}-${Math.random().toString(36).substring(7)}`,
//       status: 'POSTED',
//       type: 'ADJUSTMENT',
//       description: 'Saldo inicial',
//       reference: 'INITIAL_BALANCE',
//       source: 'SEED',
//       createdBy: 'SYSTEM',
//       postedAt: new Date(),
//     });
//     await dataSource.manager.save(journal);

//     const entry = entryRepo.create({
//       journalId: journal.id,
//       accountId: accountId,
//       side: 'DEBIT',
//       amount: amount,
//       currencyId: currencyId,
//       exchangeRate: 1,
//       description: 'Saldo inicial',
//       sequence: 1,
//     });
//     await dataSource.manager.save(entry);

//     console.log(`  ✅ Initial balance of R$ ${amount} created for account`);
//     return true;
//   }
//   return false;
// }

// // Depois de criar as accounts, adicionar:
// if (cashAccount) {
//   await createInitialBalance(
//     cashAccount.id,
//     10000, // R$ 10.000,00
//     ledger.id,
//     brlCurrency.id
//   );
// }

// if (bankAccount) {
//   await createInitialBalance(
//     bankAccount.id,
//     50000, // R$ 50.000,00
//     ledger.id,
//     brlCurrency.id
//   );
// }

// if (customerAccount) {
//   await createInitialBalance(
//     customerAccount.id,
//     5000, // R$ 5.000,00
//     ledger.id,
//     brlCurrency.id
//   );
// }

//     console.log('✅ Accounts created');
//   }
  

//   console.log('🎉 Seed completed successfully!');
// }