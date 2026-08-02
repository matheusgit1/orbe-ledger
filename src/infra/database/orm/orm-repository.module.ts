import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountType } from '../entities/account-type.entity';
import { Account } from '../entities/account.entity';
import { Audit } from '../entities/audit.entity';
import { BalanceSnapshot } from '../entities/balance-snapshot.entity';
import { ChartOfAccounts } from '../entities/chart-of-accounts.entity';
import { Currency } from '../entities/currency.entity';
import { Entry } from '../entities/entry.entity';
import { Hold } from '../entities/hold.entity';
import { Idempotency } from '../entities/idempotency.entity';
import { Inbox } from '../entities/inbox.entity';
import { Journal } from '../entities/journal.entity';
import { Ledger } from '../entities/ledger.entity';
import { Limit } from '../entities/limit.entity';
import { Organization } from '../entities/organization.entity';
import { Outbox } from '../entities/outbox.entity';
import { Reconciliation } from '../entities/reconciliation.entity';
import { SagaStep } from '../entities/saga-step.entity';
import { Saga } from '../entities/saga.entity';
import { Transaction } from '../entities/transaction.entity';
import { SagaService } from 'src/core/services/saga.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountType,
      Account,
      Audit,
      BalanceSnapshot,
      ChartOfAccounts,
      Currency,
      Entry,
      Hold,
      Idempotency,
      Inbox,
      Journal,
      Ledger,
      Limit,
      Organization,
      Outbox,
      Reconciliation,
      SagaStep,
      Saga,
      Transaction,
    ]),
  ],
  providers: [],
  exports: [TypeOrmModule],
})
export class OrmRepositoryModule {}
