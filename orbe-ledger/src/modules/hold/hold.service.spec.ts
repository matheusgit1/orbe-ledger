import { Test, TestingModule } from '@nestjs/testing';
import { HoldService } from './hold.service';

describe('HoldService', () => {
  let service: HoldService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HoldService],
    }).compile();

    service = module.get<HoldService>(HoldService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
