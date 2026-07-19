import { Test, TestingModule } from '@nestjs/testing';
import { AcountTypesService } from './acount-types.service';

describe('AcountTypesService', () => {
  let service: AcountTypesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AcountTypesService],
    }).compile();

    service = module.get<AcountTypesService>(AcountTypesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
