import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BalanceSnapshot } from '../../infra/database/entities/balance-snapshot.entity';
import { EntrySide } from '../../infra/database/common/enums/journal.enum';
import { Entry } from '../../infra/database/entities/entry.entity';

@Injectable()
export class BalanceSnapshotService {
  private readonly logger = new Logger(BalanceSnapshotService.name);

  constructor(
    @InjectRepository(BalanceSnapshot)
    private readonly balanceSnapshotRepository: Repository<BalanceSnapshot>,
  ) { }

  /**
   * Updates balance for an account after an entry
   */
  async updateBalance(
    accountId: string,
    amount: number,
    side: EntrySide,
    currencyId: string,
    queryRunner?: any,
    entryId?: string,
    journalId?: string,
  ): Promise<BalanceSnapshot> {
    this.logger.log(`Updating balance for account ${accountId}, amount: ${amount}, side: ${side}`);

    const repository = queryRunner ? queryRunner.manager : this.balanceSnapshotRepository;

    // Get current snapshot
    let snapshot = await repository.findOne(BalanceSnapshot, {
      where: { accountId },
      order: { version: 'DESC' },
    });

    // Create initial snapshot if doesn't exist
    if (!snapshot) {
      snapshot = BalanceSnapshot.createInitial(accountId, currencyId);
    } else {
      // Clone for versioning
      snapshot = snapshot.clone();
    }

    // Update balances directly without creating a temporary entry
    if (side === EntrySide.DEBIT) {
      snapshot.book -= amount;
      snapshot.available -= amount;
    } else {
      snapshot.book += amount;
      snapshot.available += amount;
    }

    // Update references if provided
    if (entryId) {
      snapshot.lastEntryId = entryId;
    }
    if (journalId) {
      snapshot.lastJournalId = journalId;
    }

    snapshot.validate();

    const savedSnapshot = await repository.save(snapshot);
    // this.logger.log(`Balance updated for account ${accountId}: available=${snapshot.available}, book=${snapshot.book}`);

    return savedSnapshot;
  }

  async getCurrentBalance(accountId: string): Promise<BalanceSnapshot | null> {
    return this.balanceSnapshotRepository.findOne({
      where: { accountId },
      order: { version: 'DESC' },
      relations: { account: true, currency: true },
    });
  }

  async getAvailableBalance(accountId: string): Promise<number> {
    const snapshot = await this.getCurrentBalance(accountId);
    return snapshot ? snapshot.available : 0;
  }
}
