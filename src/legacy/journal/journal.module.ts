import { Module } from '@nestjs/common';
import { AccountsModule } from '../acounts/accounts.module';
import { JournalService } from './journal.service';
import { JournalController } from './journal.controller';
import { OrmRepositoryModule } from '../../infra/database/orm/orm-repository.module';


@Module({
  imports: [
    OrmRepositoryModule,
    AccountsModule,
  ],
  providers: [JournalService],
  controllers: [JournalController],
  exports: [JournalService],
})
export class JournalsModule {}