import { Module } from '@nestjs/common';
import { RulesModule } from '../rules/rules.module';
import { PixInternalUsecase } from './services/transfer/usecases/pix-internal.usecase';
import { CoreModule } from '../core.module';
import { TicketUsecase } from './services/deposits/usecases/ticket.usecase';
import { TedUsecase } from './services/deposits/usecases/ted.usecase';
import { DocUsecase } from './services/deposits/usecases/doc.usecase';
import { CreateHoldUsecase } from './services/holds/create-hold.usecase';
import { ReleaseHoldUsecase } from './services/holds/release-hold.usecase';
import { CaptureHoldUsecase } from './services/holds/capture-hold.usecase';
import { LedgerPostingModule } from '../posting/ledger.posting.module';
import { ProxyModule } from 'src/infra/proxy/proxy.module';

const services = [
  /**PIX**/
  PixInternalUsecase,
  /**DEPOSITS */
  TicketUsecase,
  TedUsecase,
  DocUsecase,
  /**HOLDS */
  CreateHoldUsecase,
  ReleaseHoldUsecase,
  CaptureHoldUsecase,
  //chargback
];

@Module({
  imports: [CoreModule, RulesModule, LedgerPostingModule],
  providers: services,
  exports: services,
})
export class OrchestratorModule {}
