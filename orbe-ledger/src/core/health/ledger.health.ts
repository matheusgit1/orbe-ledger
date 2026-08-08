import { Injectable } from '@nestjs/common';
import { JournalService } from '../services/journal.service';
import { AccountsService } from '../services/accounts.service';
import { OutboxService } from '../services/outbox.service';

@Injectable()
export class LedgerHealth {
  constructor(
    private readonly journalService: JournalService,
    private readonly accountsService: AccountsService,
    private readonly outboxService: OutboxService,
  ) {}

  async check() {
    const [journalConsistency, outboxPending, totalAccounts, lastJournal] =
      await Promise.all([
        this.journalService.validateJournalConsistency(),
        this.outboxService.countPending(),
        this.accountsService.countTotal(),
        this.journalService.getLastJournal(),
      ]);

    return {
      journalDifference: journalConsistency.difference,
      outboxPending,
      balancesConsistent: journalConsistency.isBalanced,
      totalAccounts,
      lastJournalNumber: lastJournal?.journalNumber || null,
      movementsByType: journalConsistency.movementsByType,
      lastJournalCreatedAt: lastJournal?.createdAt || null,
    };
  }
}
