import { Injectable } from '@nestjs/common';
import { LedgerHealth } from 'src/core/health/ledger.health';

@Injectable()
export class HealthService {
  constructor(private ledgerHealthService: LedgerHealth) {}

  async check() {
    return await this.ledgerHealthService.check();
  }
}
