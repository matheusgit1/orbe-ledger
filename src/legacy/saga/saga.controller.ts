import { Controller } from '@nestjs/common';
import { SagaService } from './saga.service';

@Controller()
export class SagaController {
  constructor(private readonly sagaService: SagaService) {}
}
