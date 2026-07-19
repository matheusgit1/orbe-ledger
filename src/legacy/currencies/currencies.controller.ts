import { Controller } from '@nestjs/common';
import { CurrenciesService } from './currencies.service';

@Controller()
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}
}
