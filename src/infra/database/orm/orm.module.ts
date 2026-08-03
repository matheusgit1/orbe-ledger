import { Module } from '@nestjs/common';
import { OrmRepositoryModule } from './orm-repository.module';
import { OrmCoreModule } from './orm-core.module';
import { OrmService } from './orm.service';

@Module({
  imports: [OrmRepositoryModule, OrmCoreModule],
  providers: [OrmService],
  exports: [OrmRepositoryModule, OrmCoreModule, OrmService],
})
export class OrmModule {}
