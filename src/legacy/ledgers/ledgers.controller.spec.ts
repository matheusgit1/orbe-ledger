import { Test, TestingModule } from '@nestjs/testing';
import { LedgersController } from './ledgers.controller';
import { LedgersService } from './ledgers.service';

describe('LedgersController', () => {
  let controller: LedgersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LedgersController],
      providers: [LedgersService],
    }).compile();

    controller = module.get<LedgersController>(LedgersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
