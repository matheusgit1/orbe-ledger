import { Module } from '@nestjs/common';
import { HoldService } from './hold.service';
import { HoldController } from './hold.controller';
import { OrmRepositoryModule } from 'src/infra/infra/database/orm/orm-repository.module';
// import { CoreModule } from 'src/core/core.module';
// import { OrchestratorModule } from 'src/core/orchestrator/orchestrator.module';
// import { ProxyModule } from 'src/infra/proxy/proxy.module';
import { CoreModule } from 'src/core/core.module';
import { OrchestratorModule } from 'src/core/orchestrator/orchestrator.module';

@Module({
  imports: [
    OrmRepositoryModule,
    CoreModule,
    OrchestratorModule,
    // ProxyModule
  ],
  controllers: [HoldController],
  providers: [HoldService],
})
export class HoldModule {}
