import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BalanceSnapshot } from '../../infra/database/entities/balance-snapshot.entity';
import { EntrySide } from '../../infra/database/common/enums/journal.enum';
import { Entry } from '../../infra/database/entities/entry.entity';
import { QueryRunner } from 'typeorm/browser';

@Injectable()
export class BalanceSnapshotService {
  private readonly logger = new Logger(BalanceSnapshotService.name);

  constructor(
    @InjectRepository(BalanceSnapshot)
    private readonly balanceSnapshotRepository: Repository<BalanceSnapshot>,
  ) {}

  /**
   * Updates balance for an account after an entry
   */
  async updateBalance(
    queryRunner: QueryRunner,
    accountId: string,
    amount: number,
    side: EntrySide,
    currencyId: string,
    entryId?: string,
    journalId?: string,
  ): Promise<BalanceSnapshot> {
    this.logger.log(
      `Updating balance for account ${accountId}, amount: ${amount}, side: ${side}`,
    );

    const repository = queryRunner.manager;

    let snapshot = await repository.findOne(BalanceSnapshot, {
      where: { accountId },
      order: { version: 'DESC' },
      lock: { mode: 'pessimistic_read' },
    });

    if (!snapshot) {
      snapshot = BalanceSnapshot.createInitial(accountId, currencyId);
    }

    snapshot.applyEntry(amount, side, entryId, journalId);

    snapshot.validate();

    const savedSnapshot = await repository.save(snapshot);

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
