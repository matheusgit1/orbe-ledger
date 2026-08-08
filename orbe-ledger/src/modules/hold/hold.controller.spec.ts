import { Test, TestingModule } from '@nestjs/testing';
import { HoldController } from './hold.controller';
import { HoldService } from './hold.service';

describe('HoldController', () => {
  let controller: HoldController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HoldController],
      providers: [HoldService],
    }).compile();

    controller = module.get<HoldController>(HoldController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
