import { Controller } from '@nestjs/common';
import { LedgersService } from './ledgers.service';

@Controller()
export class LedgersController {
  constructor(private readonly ledgersService: LedgersService) {}
}
