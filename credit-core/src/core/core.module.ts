import { Module } from "@nestjs/common";

const services = []

@Module({
  imports: [],
  exports: services,
  providers: services
})
export class CoreModule {}