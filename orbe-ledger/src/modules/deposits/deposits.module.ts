import { Module } from '@nestjs/common';
import { DepositsService } from './deposits.service';
import { DepositsController } from './deposits.controller';
import { OrmRepositoryModule } from 'src/infra/database/orm/orm-repository.module';
import { CoreModule } from 'src/core/core.module';
import { OrchestratorModule } from 'src/core/orchestrator/orchestrator.module';

@Module({
  imports: [OrmRepositoryModule, CoreModule, OrchestratorModule],
  controllers: [DepositsController],
  providers: [DepositsService],
})
export class DepositsModule {}
