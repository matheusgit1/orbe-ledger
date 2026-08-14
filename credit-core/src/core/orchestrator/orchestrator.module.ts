import { Module } from '@nestjs/common';
import { CoreModule } from '../core.module';

const services = [];
@Module({
  imports: [CoreModule],
  providers: services,
  exports: services,
})
export class OrchestratorModule {}
