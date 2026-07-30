import { Module } from '@nestjs/common';
import { TransferRules } from './business/transfer.rules';
import { CoreModule } from '../core.module';
import { IdempotencyRules } from './business/idempotency.rules';

const service = [IdempotencyRules, TransferRules];

@Module({
  imports: [CoreModule],
  controllers: [],
  providers: service,
  exports: service,
})
export class RulesModule {}
