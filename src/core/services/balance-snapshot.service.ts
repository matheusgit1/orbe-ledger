import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BalanceSnapshot } from '../../infra/database/entities/balance-snapshot.entity';
import { EntrySide } from '../../infra/database/common/enums/journal.enum';
import { Entry } from '../../infra/database/entities/entry.entity';
import { QueryRunner } from 'typeorm/browser';
import { Journal } from 'src/infra/database/entities/journal.entity';

@Injectable()
export class BalanceSnapshotService {
  private readonly logger = new Logger(BalanceSnapshotService.name);

  constructor(
    @InjectRepository(BalanceSnapshot)
    private readonly balanceSnapshotRepository: Repository<BalanceSnapshot>,
  ) {}

  /**
   * Updates balance for an account after multiple entries
   */
  async updateBalanceByEntries(
    queryRunner: QueryRunner,
    journal: Journal,
    balance: BalanceSnapshot,
    entries: Entry[],
  ): Promise<BalanceSnapshot> {
    this.logger.log(
      `Updating balance for account ${balance.accountId} with ${entries.length} entries`,
    );

    console.log('snapshot antes: ', balance);
    console.log('entries: ', entries);

    balance.updateByEntries(entries);

    console.log('snapshot depois: ', balance);

    const savedSnapshot = await queryRunner.manager.save(balance);

    return savedSnapshot;
  }

  async getCurrentBalance(accountId: string): Promise<BalanceSnapshot | null> {
    return this.balanceSnapshotRepository.findOne({
      where: { accountId },
      order: { version: 'DESC' },
      relations: { account: true, currency: true },
    });
  }

  async getAvailableBalanceAndLock(
    queryRunner: QueryRunner,
    accountId: string,
  ): Promise<BalanceSnapshot> {
    const snapshot = await queryRunner.manager.findOneOrFail(BalanceSnapshot, {
      where: { accountId },
      order: { version: 'DESC' },
      // lock: { mode: 'pessimistic_read' },
    });

    return snapshot;
  }
}
