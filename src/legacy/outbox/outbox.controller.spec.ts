import { Test, TestingModule } from '@nestjs/testing';
import { OutboxController } from './outbox.controller';
import { OutboxService } from './outbox.service';

describe('OutboxController', () => {
  let controller: OutboxController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutboxController],
      providers: [OutboxService],
    }).compile();

    controller = module.get<OutboxController>(OutboxController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
