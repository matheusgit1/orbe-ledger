import { Module } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { OrmRepositoryModule } from '../../infra/database/orm/orm-repository.module';

@Module({
  imports: [OrmRepositoryModule],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService]
})
export class AccountsModule {}
