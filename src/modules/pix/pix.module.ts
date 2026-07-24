import { Module } from '@nestjs/common';
import { PixService } from './pix.service';
import { PixController } from './pix.controller';
import { OrmRepositoryModule } from 'src/infra/database/orm/orm-repository.module';
import { CoreModule } from 'src/core/core.module';

@Module({
  imports: [OrmRepositoryModule, CoreModule],
  controllers: [PixController],
  providers: [PixService],
})
export class PixModule {}
