import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Service } from '../entities/service.entity';
import { Tax } from '../entities/tax.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Service, Tax])],
  providers: [],
  exports: [TypeOrmModule],
})
export class OrmRepositoryModule {}
