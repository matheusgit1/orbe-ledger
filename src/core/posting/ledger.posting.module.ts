import { Module } from '@nestjs/common';
import { LedgerPosting } from './ledger.posting';
import { CoreModule } from '../core.module';
import { PixPostingUsecase } from './usecase/pix-posting.usecase';
import { LedgerPostingStrategy } from './ledger.posting.strategy';

const services = [LedgerPosting, LedgerPostingStrategy, PixPostingUsecase];

@Module({
  imports: [CoreModule],
  providers: services,
  exports: services,
})
export class LedgerPostingModule {}
