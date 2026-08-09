import { Module } from '@nestjs/common';
import { ServiceService } from './services/service.service';
import { FeeService } from './services/fee.service';
import { OrmModule } from 'src/infra/database/orm/orm.module';
import { TaxService } from './services/tax.service';

const services = [ServiceService, FeeService, TaxService];

@Module({
  imports: [OrmModule],
  providers: services,
  exports: [...services, OrmModule],
})
export class CoreModule {}
