import { Test, TestingModule } from '@nestjs/testing';
import { ChargebackController } from './chargeback.controller';
import { ChargebackService } from './chargeback.service';

describe('ChargebackController', () => {
  let controller: ChargebackController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChargebackController],
      providers: [ChargebackService],
    }).compile();

    controller = module.get<ChargebackController>(ChargebackController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
