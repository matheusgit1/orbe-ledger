import { Module } from '@nestjs/common';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';
import { OrmRepositoryModule } from 'src/infra/database/orm/orm-repository.module';
import { CoreModule } from 'src/core/core.module';
import { OrchestratorModule } from 'src/core/orchestrator/orchestrator.module';

@Module({
  imports: [OrmRepositoryModule, CoreModule, OrchestratorModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
