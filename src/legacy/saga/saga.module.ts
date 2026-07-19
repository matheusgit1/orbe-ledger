import { Module } from '@nestjs/common';
import { SagaService } from './saga.service';
import { SagaController } from './saga.controller';
import { OrmRepositoryModule } from '../../infra/database/orm/orm-repository.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { JournalsModule } from '../journal/journal.module';
import { AccountsModule } from '../acounts/accounts.module';
import { HoldModule } from '../hold/hold.module';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [OrmRepositoryModule, TransactionsModule, JournalsModule, AccountsModule, HoldModule, OutboxModule],
  controllers: [SagaController],
  providers: [SagaService],
  exports: [SagaService]
})
export class SagaModule {}
