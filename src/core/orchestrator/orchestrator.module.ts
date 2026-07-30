import { Module } from '@nestjs/common';
import { RulesModule } from '../rules/rules.module';
import { PixInternalUsecase } from './services/transfer/usecases/pix-internal.usecase';
import { CoreModule } from '../core.module';
import { PixExternalUsecase } from './services/transfer/usecases/pix-external.usecase';

const services = [PixInternalUsecase, PixExternalUsecase];

@Module({
  imports: [CoreModule, RulesModule],
  providers: services,
  exports: services,
})
export class OrchestratorModule {}
