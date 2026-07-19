import { Test, TestingModule } from '@nestjs/testing';
import { SagaController } from './saga.controller';
import { SagaService } from './saga.service';

describe('SagaController', () => {
  let controller: SagaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SagaController],
      providers: [SagaService],
    }).compile();

    controller = module.get<SagaController>(SagaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
