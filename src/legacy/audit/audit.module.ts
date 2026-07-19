import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
// import { AuditInterceptor } from '../../interceptors/audit.interceptor';
import { AuditController } from './audit.controller';
import { OrmRepositoryModule } from '../../infra/database/orm/orm-repository.module';

@Global()
@Module({
  imports: [OrmRepositoryModule],
  providers: [
    AuditService,
    // AuditInterceptor,
  ],
  controllers: [AuditController],
  exports: [AuditService, /**AuditInterceptor*/],
})
export class AuditModule {}