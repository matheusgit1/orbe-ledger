import { Controller } from '@nestjs/common';
import { HoldService } from './hold.service';

@Controller()
export class HoldController {
  constructor(private readonly holdService: HoldService) {}
}
