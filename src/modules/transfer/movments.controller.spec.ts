import { Test, TestingModule } from '@nestjs/testing';
import { MovementsController } from './movments.controller';
import { MovementsService } from './movments.service';

describe('TranseferController', () => {
  let controller: MovementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MovementsController],
      providers: [MovementsService],
    }).compile();

    controller = module.get<MovementsController>(MovementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
