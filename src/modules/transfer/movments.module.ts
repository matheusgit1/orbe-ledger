import { Module } from '@nestjs/common';
import { MovementsService } from './movments.service';
import { MovementsController } from './movments.controller';
import { OrmRepositoryModule } from 'src/infra/database/orm/orm-repository.module';
import { CoreModule } from 'src/core/core.module';

@Module({
  imports: [OrmRepositoryModule, CoreModule],
  controllers: [MovementsController],
  providers: [MovementsService],
})
export class MovementsModule {}
