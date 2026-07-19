import { Test, TestingModule } from '@nestjs/testing';
import { MovementsService } from './movments.service';

describe('TranseferService', () => {
  let service: MovementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MovementsService],
    }).compile();

    service = module.get<MovementsService>(MovementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
