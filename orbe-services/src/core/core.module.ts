import { Module } from '@nestjs/common';
import { ServiceService } from './services/service.service';
import { FeeService } from './services/fee.service';
import { OrmModule } from 'src/infra/database/orm/orm.module';

const services = [
  ServiceService,
  FeeService,
];

@Module({
  imports: [OrmModule],
  providers: services,
  exports: [...services, OrmModule],
})
export class CoreModule {}
