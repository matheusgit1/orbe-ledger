import { Module } from '@nestjs/common';
import { OrmRepositoryModule } from './orm-repository.module';
import { OrmCoreModule } from './orm-core.module';

@Module({
  imports: [OrmRepositoryModule, OrmCoreModule],
  providers: [],
  exports: [OrmRepositoryModule, OrmCoreModule],
})
export class OrmModule {}