import { Module } from '@nestjs/common';
import { TransactionService } from './transactions.service';
import { TransactionController } from './transactions.controller';
import { OrmRepositoryModule } from '../../infra/database/orm/orm-repository.module';
import { JournalsModule } from '../journal/journal.module';
import { AccountsModule } from '../acounts/accounts.module';
import { OutboxModule } from '../outbox/outbox.module';
import { HoldModule } from '../hold/hold.module';

@Module({
  imports: [OrmRepositoryModule, JournalsModule, AccountsModule, OutboxModule, HoldModule],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService]
})
export class TransactionsModule {}
