import { Module } from '@nestjs/common';
import { CoreModule } from '../core.module';
import { PixPostingUsecase } from './strategies/pix/pix-posting.strategy';
import { LedgerPostingStrategy } from './ledger.posting.strategy';
import { TicketPostingStrategy } from './strategies/deposit/ticket-posting.strategy';
import { TedPostingStrategy } from './strategies/deposit/ted-posting.strategy';
import { DocPostingStrategy } from './strategies/deposit/doc-posting.strategy';
import { HoldPostingStrategy } from './strategies/hold/hold-posting.strategy';
import { HoldReleasePostingStrategy } from './strategies/hold/hold-release-posting.strategy';
import { HoldCapturePostingStrategy } from './strategies/hold/hold-capture-posting.strategy';

const services = [
  LedgerPostingStrategy,
  PixPostingUsecase,
  TicketPostingStrategy,
  TedPostingStrategy,
  DocPostingStrategy,
  HoldPostingStrategy,
  HoldReleasePostingStrategy,
  HoldCapturePostingStrategy,
];

@Module({
  imports: [CoreModule],
  providers: services,
  exports: services,
})
export class LedgerPostingModule {}
