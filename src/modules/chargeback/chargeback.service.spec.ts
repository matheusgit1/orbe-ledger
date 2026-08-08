import { Test, TestingModule } from '@nestjs/testing';
import { ChargebackService } from './chargeback.service';

describe('ChargebackService', () => {
  let service: ChargebackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChargebackService],
    }).compile();

    service = module.get<ChargebackService>(ChargebackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
