import { Module } from '@nestjs/common';
import { EntryService } from './entry.service';
import { EntryController } from './entry.controller';
import { OrmRepositoryModule } from '../../infra/database/orm/orm-repository.module';

@Module({
  imports: [OrmRepositoryModule],
  controllers: [EntryController],
  providers: [EntryService],
})
export class EntryModule {}
