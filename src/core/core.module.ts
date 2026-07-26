import { Module } from '@nestjs/common';
import { LedgerService } from './services/ledger.service';
import { TransferService } from './services/transfer.service';
import { JournalService } from './services/journal.service';
import { BalanceSnapshotService } from './services/balance-snapshot.service';
import { OutboxService } from './services/outbox.service';
import { AuditService } from './services/audit.service';
import { OrmModule } from 'src/infra/database/orm/orm.module';
import { BalanceService } from './services/balance.service';
import { InstitutionIdentifierService } from './services/institution-identifier.service';
import { FeeCalculatorService } from './services/fee-calculator.service';
import { IdempotencyService } from './services/idempotency.service';
import { AccountsService } from './services/accounts.service';
import { TransactionService } from './services/transaction.service';
import { EntryService } from './services/entry.service';
import { CurrencyService } from './services/currency.service';
import { LimiteService } from './services/limite.service';

const services = [
  LedgerService,
  TransferService,
  JournalService,
  BalanceSnapshotService,
  OutboxService,
  AuditService,
  BalanceService,
  InstitutionIdentifierService,
  FeeCalculatorService,
  IdempotencyService,
  AccountsService,
  TransactionService,
  EntryService,
  CurrencyService,
  LimiteService,
];

@Module({
  imports: [OrmModule],
  providers: services,
  exports: services,
})
export class CoreModule {}
