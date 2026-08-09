import { Injectable } from '@nestjs/common';
import { LedgerHealth } from 'src/core/health/ledger.health';

@Injectable()
export class LedgerConsistenceService {
  constructor(private healthLeadger: LedgerHealth) {}
  async getHealth() {
    return await this.healthLeadger.check();
  }
}
