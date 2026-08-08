import { Module } from '@nestjs/common';
import { LedgerPosting } from './ledger.posting';
import { CoreModule } from '../core.module';
import { PixPostingUsecase } from './strategies/pix/pix-posting.strategy';
import { LedgerPostingStrategy } from './ledger.posting.strategy';
import { TicketPostingStrategy } from './strategies/deposit/ticket-posting.strategy';
import { TedPostingStrategy } from './strategies/deposit/ted-posting.strategy';

const services = [
  LedgerPosting,
  LedgerPostingStrategy,
  PixPostingUsecase,
  TicketPostingStrategy,
  TedPostingStrategy
];

@Module({
  imports: [CoreModule],
  providers: services,
  exports: services,
})
export class LedgerPostingModule {}
