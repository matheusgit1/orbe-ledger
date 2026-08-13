import { Module } from '@nestjs/common';

const services = [];
@Module({
  imports: [],
  providers: services,
  exports: services,
})
export class OrchestratorModule {}
