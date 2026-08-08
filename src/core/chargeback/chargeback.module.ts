import { Module } from '@nestjs/common';
import { HoldChargebackUsecase } from './usecases/hold-chargeback.usecase';
import { CoreModule } from '../core.module';
import { RulesModule } from '../rules/rules.module';

const usecases = [HoldChargebackUsecase];

@Module({
  imports: [CoreModule, RulesModule, ChargebackModule, ChargebackModule],
  providers: [...usecases],
  exports: [...usecases],
})
export class ChargebackModule {}
