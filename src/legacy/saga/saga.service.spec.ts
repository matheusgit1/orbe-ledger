import { Test, TestingModule } from '@nestjs/testing';
import { SagaService } from './saga.service';

describe('SagaService', () => {
  let service: SagaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SagaService],
    }).compile();

    service = module.get<SagaService>(SagaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
