import { Controller } from '@nestjs/common';
import { AcountTypesService } from './acount-types.service';

@Controller()
export class AcountTypesController {
  constructor(private readonly acountTypesService: AcountTypesService) {}
}
