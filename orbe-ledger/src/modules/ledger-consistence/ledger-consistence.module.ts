import { Module } from '@nestjs/common';
import { LedgerConsistenceService } from './ledger-consistence.service';
import { LedgerConsistenceController } from './ledger-consistence.controller';
import { CoreModule } from 'src/core/core.module';

@Module({
  imports: [CoreModule],
  controllers: [LedgerConsistenceController],
  providers: [LedgerConsistenceService],
})
export class LedgerConsistenceModule {}
