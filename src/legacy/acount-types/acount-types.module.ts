import { Module } from '@nestjs/common';
import { AcountTypesService } from './acount-types.service';
import { AcountTypesController } from './acount-types.controller';
import { OrmRepositoryModule } from '../../infra/database/orm/orm-repository.module';

@Module({
  imports: [OrmRepositoryModule],
  controllers: [AcountTypesController],
  providers: [AcountTypesService],
})
export class AcountTypesModule {}
