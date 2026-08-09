import { Test, TestingModule } from '@nestjs/testing';
import { LedgerConsistenceController } from './ledger-consistence.controller';
import { LedgerConsistenceService } from './ledger-consistence.service';

describe('LedgerConsistenceController', () => {
  let controller: LedgerConsistenceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LedgerConsistenceController],
      providers: [LedgerConsistenceService],
    }).compile();

    controller = module.get<LedgerConsistenceController>(LedgerConsistenceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
