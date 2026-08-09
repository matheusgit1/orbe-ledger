import { Test, TestingModule } from '@nestjs/testing';
import { LedgerConsistenceService } from './ledger-consistence.service';

describe('LedgerConsistenceService', () => {
  let service: LedgerConsistenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LedgerConsistenceService],
    }).compile();

    service = module.get<LedgerConsistenceService>(LedgerConsistenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
