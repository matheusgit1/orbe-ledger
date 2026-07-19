import { Module } from '@nestjs/common';
import { CurrenciesService } from './currencies.service';
import { CurrenciesController } from './currencies.controller';
import { OrmRepositoryModule } from '../../infra/database/orm/orm-repository.module';

@Module({
  imports: [OrmRepositoryModule],
  controllers: [CurrenciesController],
  providers: [CurrenciesService],
})
export class CurrenciesModule {}
