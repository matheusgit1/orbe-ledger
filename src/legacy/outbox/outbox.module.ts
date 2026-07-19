import { Module } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { OutboxController } from './outbox.controller';
import { OrmRepositoryModule } from '../../infra/database/orm/orm-repository.module';

@Module({
  imports: [OrmRepositoryModule],
  controllers: [OutboxController],
  providers: [OutboxService],
  exports: [OutboxService]
})
export class OutboxModule {}
