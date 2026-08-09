import { Controller, Get } from '@nestjs/common';
import { LedgerConsistenceService } from './ledger-consistence.service';

@Controller('ledger-consistence')
export class LedgerConsistenceController {
  constructor(
    private readonly ledgerConsistenceService: LedgerConsistenceService,
  ) {}

  @Get('health')
  async getHealth() {
    return await this.ledgerConsistenceService.getHealth();
  }
}
