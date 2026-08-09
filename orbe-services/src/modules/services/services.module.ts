import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { CoreModule } from 'src/core/core.module';

@Module({
  imports: [CoreModule],
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
