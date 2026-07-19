import { Module } from '@nestjs/common';
import { LedgersService } from './ledgers.service';
import { LedgersController } from './ledgers.controller';
import { OrmRepositoryModule } from '../../infra/database/orm/orm-repository.module';

@Module({
  imports: [OrmRepositoryModule],
  controllers: [LedgersController],
  providers: [LedgersService],
  exports: [LedgersService],
})
export class LedgersModule {}
