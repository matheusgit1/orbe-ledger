import { Test, TestingModule } from '@nestjs/testing';
import { AcountTypesController } from './acount-types.controller';
import { AcountTypesService } from './acount-types.service';

describe('AcountTypesController', () => {
  let controller: AcountTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AcountTypesController],
      providers: [AcountTypesService],
    }).compile();

    controller = module.get<AcountTypesController>(AcountTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
