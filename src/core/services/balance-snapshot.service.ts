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
   * Detecta automaticamente o tipo de operação (transferência ou hold)
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

    // Usa o método genérico que delega para os métodos específicos
    balance.updateByEntries(entries);

    console.log('snapshot depois: ', balance);

    const savedSnapshot = await queryRunner.manager.save(balance);

    return savedSnapshot;
  }

  /**
   * Atualiza balanço para transferência normal
   * Afecta: book e available
   */
  async updateBalanceForTransfer(
    queryRunner: QueryRunner,
    balance: BalanceSnapshot,
    amount: number,
    isDebit: boolean,
    entryId?: string,
    journalId?: string,
  ): Promise<BalanceSnapshot> {
    this.logger.log(
      `Updating balance for transfer on account ${balance.accountId}, amount: ${amount}, isDebit: ${isDebit}`,
    );

    console.log('snapshot antes: ', balance);

    balance.applyTransfer(amount, isDebit, entryId, journalId);

    console.log('snapshot depois: ', balance);

    const savedSnapshot = await queryRunner.manager.save(balance);

    return savedSnapshot;
  }

  /**
   * Atualiza balanço para criação de hold
   * Mantém: book
   * Subtrai: available
   * Soma: held
   */
  async updateBalanceForHold(
    queryRunner: QueryRunner,
    balance: BalanceSnapshot,
    amount: number,
    entryId?: string,
    journalId?: string,
  ): Promise<BalanceSnapshot> {
    this.logger.log(
      `Updating balance for hold on account ${balance.accountId}, amount: ${amount}`,
    );

    console.log('snapshot antes: ', balance);

    balance.applyHold(amount, entryId, journalId);

    console.log('snapshot depois: ', balance);

    const savedSnapshot = await queryRunner.manager.save(balance);

    return savedSnapshot;
  }

  /**
   * Atualiza balanço para liberação de hold
   * Mantém: book
   * Soma: available
   * Subtrai: held
   */
  async updateBalanceForHoldRelease(
    queryRunner: QueryRunner,
    balance: BalanceSnapshot,
    amount: number,
    entryId?: string,
    journalId?: string,
  ): Promise<BalanceSnapshot> {
    this.logger.log(
      `Updating balance for hold release on account ${balance.accountId}, amount: ${amount}`,
    );

    console.log('snapshot antes: ', balance);

    balance.applyHoldRelease(amount, entryId, journalId);

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
