import { Module } from "@nestjs/common";
import { CreditRulesService } from "./services/credit-rules.service";

const services = [
  CreditRulesService
]

@Module({
  imports: [],
  exports: services,
  providers: services
})
export class CoreModule {}