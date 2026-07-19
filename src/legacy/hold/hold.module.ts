// src/core/holds/holds.module.ts
import { Module } from '@nestjs/common';
import { OutboxModule } from '../outbox/outbox.module';
import { AuditModule } from '../audit/audit.module';
import { AccountsModule } from '../acounts/accounts.module';
import { JournalsModule } from '../journal/journal.module';
import { HoldController } from './hold.controller';
import { HoldService } from './hold.service';
import { OrmRepositoryModule } from '../../infra/database/orm/orm-repository.module';


@Module({
  imports: [
    OrmRepositoryModule,
    AccountsModule,
    JournalsModule,
    OutboxModule,
    AuditModule,
  ],
  providers: [HoldService],
  controllers: [HoldController],
  exports: [HoldService],
})
export class HoldModule {}
