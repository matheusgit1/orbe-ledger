// src/core/services/journal.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, Like } from 'typeorm';
import {
  CreateJournalOptions,
  Journal,
} from '../../infra/database/entities/journal.entity';
import {
  CreateEntryProps,
  Entry,
} from '../../infra/database/entities/entry.entity';
import { BalanceSnapshot } from '../../infra/database/entities/balance-snapshot.entity';
import {
  JournalType,
  JournalStatus,
  EntrySide,
} from '../../infra/database/common/enums/journal.enum';
import { OutboxEventType } from '../../infra/database/common/enums/outbox.enum';
import {
  AuditEntity,
  AuditAction,
} from '../../infra/database/common/enums/audit.enum';
import { BalanceSnapshotService } from './balance-snapshot.service';
import { OutboxService } from './outbox.service';
import { AuditService } from './audit.service';
import { QueryRunner } from 'typeorm/browser';
import { EntryService } from './entry.service';
import { EntityType } from 'src/infra/database/common/enums/idempotency.status';
import { AccountsService } from './accounts.service';
import { CurrencyService } from './currency.service';

export interface CreateEntryDto {
  accountId: string;
  side: EntrySide;
  amount: number;
  currencyId: string;
  description?: string;
  holdId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class JournalService {
  private readonly logger = new Logger(JournalService.name);

  constructor(
    @InjectRepository(Journal)
    private readonly journalRepository: Repository<Journal>,
    @InjectRepository(Entry)
    private readonly entryRepository: Repository<Entry>,
    private readonly balanceSnapshotService: BalanceSnapshotService,
    private readonly outboxService: OutboxService,
    private readonly auditService: AuditService,
    private readonly entryService: EntryService,
  ) {}

  async registerJournal(
    queryRunner: QueryRunner,
    hash: string,
    journal: Journal,
  ): Promise<Journal> {
    try {
      this.logger.log(`[${hash}] Criando journal tipo ${journal.type}`);

      for (const entry of journal.entries) {
        const balanceSnapshot =
          await this.balanceSnapshotService.getAvailableBalanceAndLock(
            queryRunner,
            entry.accountId,
          );
        if (!balanceSnapshot) {
          throw new Error(
            `Balance snapshot not found for account ${entry.accountId}`,
          );
        }
        await this.balanceSnapshotService.updateBalance(
          queryRunner,
          journal,
          balanceSnapshot,
          entry,
        );
      }

      journal.setStatus(JournalStatus.POSTED);
      const savedJournal = await this.saveJournal(queryRunner, journal);

      await this.auditService.createAudit(
        AuditEntity.JOURNAL,
        journal.id,
        AuditAction.CREATE,
        journal.createdBy || 'SYSTEM',
        hash,
        {
          journalNumber: journal.journalNumber,
          type: journal.type,
          entriesCount: journal.entries.length,
          totalAmount:
            journal.entries.reduce((sum, e) => sum + e.amount, 0) / 2,
        },
        {
          id: journal.id,
          journalNumber: journal.journalNumber,
          type: journal.type,
          status: journal.status,
          entries: journal.entries.map((e) => ({
            accountId: e.accountId,
            side: e.side,
            amount: e.amount,
            currencyId: e.currencyId,
          })),
        },
      );

      await this.createOutboxEvents(
        savedJournal,
        savedJournal.entries,
        queryRunner,
      );

      const result = await this.findByIdWithQueryRunner(
        queryRunner,
        savedJournal.id,
      );
      this.logger.log(`[${hash}] Journal ${savedJournal} criado com sucesso`);
      return result;
    } catch (error: any) {
      this.logger.error(`[${hash}] Erro ao criar journal: ${error.message}`);
      throw new BadRequestException(`Erro ao criar journal: ${error.message}`);
    }
  }

  // async createReversalJournal(
  //   originalJournalId: string,
  //   reason: string,
  //   traceId: string,
  //   queryRunner: any,
  // ): Promise<Journal> {
  //   const shouldManageTransaction = !queryRunner;
  //   const qr = queryRunner || this.dataSource.createQueryRunner();

  //   if (shouldManageTransaction) {
  //     await qr.connect();
  //     await qr.startTransaction();
  //   }

  //   try {
  //     this.logger.log(
  //       `[${traceId}] Criando journal de reversão para ${originalJournalId}`,
  //     );

  //     const originalJournal = await qr.manager.findOne(Journal, {
  //       where: { id: originalJournalId },
  //       relations: { entries: true },
  //     });

  //     if (!originalJournal) {
  //       throw new Error(`Journal ${originalJournalId} não encontrado`);
  //     }

  //     if (!originalJournal.canBeReversed()) {
  //       throw new Error(
  //         `Journal ${originalJournal.journalNumber} não pode ser revertido`,
  //       );
  //     }

  //     const reversalEntries: CreateEntryDto[] = originalJournal.entries.map(
  //       (entry) => ({
  //         accountId: entry.accountId,
  //         side:
  //           entry.side === EntrySide.DEBIT ? EntrySide.CREDIT : EntrySide.DEBIT,
  //         amount: entry.amount,
  //         currencyId: entry.currencyId,
  //         description: `Reversão de: ${entry.description || 'Entry original'}`,
  //         metadata: {
  //           originalEntryId: entry.id,
  //           originalJournalId: originalJournalId,
  //           reversalReason: reason,
  //         },
  //       }),
  //     );

  //     const journalNumber = await this.generateJournalNumber();

  //     const reversalJournal = await this.createJournal(qr, {
  //       ledgerId: originalJournal.ledgerId,
  //       number: journalNumber,
  //       type: JournalType.REVERSAL,
  //       status: JournalStatus.PENDING,
  //       description: `Reversão do journal ${originalJournal.journalNumber}: ${reason}`,
  //       reference: originalJournal.reference,
  //       externalReference: originalJournal.externalReference,
  //       correlationId: originalJournal.id,
  //       causationId: originalJournal.causationId,
  //       source: 'REVERSAL',
  //       createdBy: 'SYSTEM',
  //       entries: reversalEntries,
  //       metadata: {
  //         originalJournalId,
  //         originalJournalNumber: originalJournal.journalNumber,
  //         reversalReason: reason,
  //         isFullReversal: true,
  //       },
  //     });

  //     originalJournal.status = JournalStatus.REVERSED;
  //     await qr.manager.save(originalJournal);

  //     if (shouldManageTransaction) {
  //       await qr.commitTransaction();
  //     }

  //     this.logger.log(`[${traceId}] Journal de reversão criado com sucesso`);
  //     return reversalJournal;
  //   } catch (error: any) {
  //     if (shouldManageTransaction) {
  //       await qr.rollbackTransaction();
  //     }
  //     this.logger.error(
  //       `[${traceId}] Erro ao criar reversão: ${error.message}`,
  //     );
  //     throw error;
  //   } finally {
  //     if (shouldManageTransaction) {
  //       await qr.release();
  //     }
  //   }
  // }

  /**
   * Cria reversão parcial (apenas entries específicas)
   */
  // async createPartialReversalJournal(
  //   originalJournalId: string,
  //   entriesToReverse: Array<{
  //     entryId: string;
  //     accountId: string;
  //     amount: number;
  //     side: EntrySide;
  //     currencyId: string;
  //   }>,
  //   reason: string,
  //   traceId: string,
  //   queryRunner: any,
  // ): Promise<Journal> {
  //   const shouldManageTransaction = !queryRunner;
  //   const qr = queryRunner || this.dataSource.createQueryRunner();

  //   if (shouldManageTransaction) {
  //     await qr.connect();
  //     await qr.startTransaction();
  //   }

  //   try {
  //     this.logger.log(
  //       `[${traceId}] Criando reversão parcial para ${originalJournalId}`,
  //     );

  //     const originalJournal = await qr.manager.findOne(Journal, {
  //       where: { id: originalJournalId },
  //       relations: { entries: true },
  //     });

  //     if (!originalJournal) {
  //       throw new Error(`Journal ${originalJournalId} não encontrado`);
  //     }

  //     // Cria entries de reversão para as entries específicas
  //     const reversalEntries: CreateEntryDto[] = entriesToReverse.map(
  //       (entry) => ({
  //         accountId: entry.accountId,
  //         side:
  //           entry.side === EntrySide.DEBIT ? EntrySide.CREDIT : EntrySide.DEBIT,
  //         amount: entry.amount,
  //         currencyId: entry.currencyId,
  //         description: `Reversão parcial de entry ${entry.entryId}`,
  //         metadata: {
  //           originalEntryId: entry.entryId,
  //           originalJournalId: originalJournalId,
  //           reversalReason: reason,
  //         },
  //       }),
  //     );

  //     const journalNumber = await this.generateJournalNumber();

  //     const reversalJournal = await this.createJournal(qr, {
  //       ledgerId: originalJournal.ledgerId,
  //       number: journalNumber,
  //       type: JournalType.REVERSAL,
  //       status: JournalStatus.PENDING,
  //       description: `Reversão parcial do journal ${originalJournal.journalNumber}: ${reason}`,
  //       correlationId: originalJournal.id,
  //       source: 'REVERSAL',
  //       createdBy: 'SYSTEM',
  //       entries: reversalEntries,
  //       metadata: {
  //         originalJournalId,
  //         originalJournalNumber: originalJournal.journalNumber,
  //         reversalReason: reason,
  //         isPartialReversal: true,
  //         reversedEntries: entriesToReverse.map((e) => e.entryId),
  //       },
  //     });

  //     if (shouldManageTransaction) {
  //       await qr.commitTransaction();
  //     }

  //     this.logger.log(`[${traceId}] Reversão parcial criada com sucesso`);
  //     return reversalJournal;
  //   } catch (error: any) {
  //     if (shouldManageTransaction) {
  //       await qr.rollbackTransaction();
  //     }
  //     this.logger.error(
  //       `[${traceId}] Erro ao criar reversão parcial: ${error.message}`,
  //     );
  //     throw error;
  //   } finally {
  //     if (shouldManageTransaction) {
  //       await qr.release();
  //     }
  //   }
  // }

  /**
   * Valida que débitos = créditos (partidas dobradas)
   */
  // private validateDoubleEntry(entries: Entry[]): void {
  //   let totalDebit = 0;
  //   let totalCredit = 0;

  //   for (const entry of entries) {
  //     if (entry.isDebit()) {
  //       totalDebit += entry.amount;
  //     } else if (entry.isCredit()) {
  //       totalCredit += entry.amount;
  //     } else {
  //       throw new Error(`Lado inválido: ${entry.side}`);
  //     }
  //   }

  //   if (Math.abs(totalDebit - totalCredit) > 0.01) {
  //     throw new Error(
  //       `Journal não está balanceado. Débito: ${totalDebit}, Crédito: ${totalCredit}`,
  //     );
  //   }

  //   if (entries.length < 2) {
  //     throw new Error(
  //       'Journal deve ter pelo menos 2 entries (débito e crédito)',
  //     );
  //   }
  // }

  // /**
  //  * Valida que todas as moedas existem
  //  */
  // private async validateCurrencies(entries: CreateEntryDto[]): Promise<void> {
  //   const currencyIds = [...new Set(entries.map((e) => e.currencyId))];

  //   for (const currencyId of currencyIds) {
  //     const currency = await this.currencyService.findByFilters({
  //       id: currencyId,
  //     });

  //     if (!currency) {
  //       throw new Error(`Moeda ${currencyId} não encontrada`);
  //     }

  //     if (!currency.isActive) {
  //       throw new Error(`Moeda ${currencyId} não está ativa`);
  //     }
  //   }
  // }

  /**
   * Gera número único para journal
   * Formato: JNL-{YYYYMMDD}-{SEQUENCE}
   */
  private async generateJournalNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const lastJournal = await this.journalRepository.findOne({
      where: {
        journalNumber: Like(`JNL-${dateStr}-%`),
      },
      order: { journalNumber: 'DESC' },
    });

    let sequence = 1;
    if (lastJournal) {
      const parts = lastJournal.journalNumber.split('-');
      sequence = parseInt(parts[parts.length - 1]) + 1;
    }
    return `JNL-${dateStr}-${String(sequence).padStart(6, '0')}`;
  }

  /**
   * Cria eventos outbox para o journal
   */
  private async createOutboxEvents(
    journal: Journal,
    entries: Entry[],
    queryRunner: any,
  ): Promise<void> {
    const eventType = this.mapJournalTypeToEventType(journal.type);
    if (!eventType) return;

    await this.outboxService.createOutbox(
      EntityType.JOURNAL,
      journal.id,
      eventType,
      {
        journalId: journal.id,
        journalNumber: journal.journalNumber,
        type: journal.type,
        status: journal.status,
        correlationId: journal.correlationId,
        entries: entries.map((e) => ({
          accountId: e.accountId,
          side: e.side,
          amount: e.amount,
          currencyId: e.currencyId,
        })),
        postedAt: journal.postedAt,
        totalAmount: entries.reduce((sum, e) => sum + e.amount, 0) / 2,
      },
      queryRunner,
    );
  }

  /**
   * Mapeia tipo de journal para evento outbox
   */
  private mapJournalTypeToEventType(
    journalType: JournalType,
  ): OutboxEventType | null {
    const mapping: Record<JournalType, OutboxEventType | null> = {
      [JournalType.TRANSFER]: OutboxEventType.JOURNAL_CREATED,
      [JournalType.PIX]: OutboxEventType.JOURNAL_CREATED,
      [JournalType.TRANSFER_DEBIT]: OutboxEventType.JOURNAL_CREATED,
      [JournalType.LIQUIDACAO_SAIDA]: OutboxEventType.JOURNAL_CREATED,
      [JournalType.LIQUIDACAO_ENTRADA]: OutboxEventType.JOURNAL_CREATED,
      [JournalType.TRANSFER_CREDIT]: OutboxEventType.JOURNAL_CREATED,
      [JournalType.REVERSAL]: OutboxEventType.JOURNAL_REVERSED,
      [JournalType.TED]: OutboxEventType.JOURNAL_CREATED,
      [JournalType.DOC]: OutboxEventType.JOURNAL_CREATED,
      [JournalType.FEE]: OutboxEventType.JOURNAL_CREATED,
      [JournalType.SETTLEMENT]: OutboxEventType.JOURNAL_CREATED,
      [JournalType.REFUND]: OutboxEventType.JOURNAL_CREATED,
      [JournalType.HOLD]: OutboxEventType.JOURNAL_CREATED,
      [JournalType.RELEASE]: OutboxEventType.JOURNAL_CREATED,
      [JournalType.ADJUSTMENT]: OutboxEventType.JOURNAL_CREATED,
      [JournalType.CASHBACK]: OutboxEventType.JOURNAL_CREATED,
      [JournalType.TAX]: OutboxEventType.JOURNAL_CREATED,
      [JournalType.INTEREST]: OutboxEventType.JOURNAL_CREATED,
    };

    return mapping[journalType] || OutboxEventType.JOURNAL_CREATED;
  }

  async findById(id: string): Promise<Journal> {
    const journal = await this.journalRepository.findOne({
      where: { id },
      relations: {
        entries: {
          account: true,
          currency: true,
        },
      },
    });

    if (!journal) {
      throw new Error(`Journal ${id} não encontrado`);
    }

    return journal;
  }

  async findByIdWithQueryRunner(
    queryRunner: QueryRunner,
    id: string,
  ): Promise<Journal> {
    const journal = await queryRunner.manager.findOne(Journal, {
      where: { id },
      relations: {
        entries: {
          account: true,
          currency: true,
        },
      },
    });

    if (!journal) {
      throw new Error(`Journal ${id} não encontrado`);
    }

    return journal;
  }

  /**
   * Busca journal por número
   */
  async findByJournalNumber(journalNumber: string): Promise<Journal | null> {
    return this.journalRepository.findOne({
      where: { journalNumber },
      relations: {
        entries: {
          account: true,
          currency: true,
        },
      },
    });
  }

  /**
   * Busca journals por correlation ID
   */
  async findByCorrelationId(correlationId: string): Promise<Journal[]> {
    return this.journalRepository.find({
      where: { correlationId },
      relations: {
        entries: {
          account: true,
          currency: true,
        },
      },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Busca journals por período
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    options?: {
      limit?: number;
      offset?: number;
      type?: JournalType;
      status?: JournalStatus;
      ledgerId?: string;
    },
  ): Promise<[Journal[], number]> {
    const queryBuilder = this.journalRepository
      .createQueryBuilder('journal')
      .where('journal.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .leftJoinAndSelect('journal.entries', 'entries')
      .leftJoinAndSelect('entries.account', 'account')
      .orderBy('journal.createdAt', 'DESC');

    if (options?.type) {
      queryBuilder.andWhere('journal.type = :type', { type: options.type });
    }

    if (options?.status) {
      queryBuilder.andWhere('journal.status = :status', {
        status: options.status,
      });
    }

    if (options?.ledgerId) {
      queryBuilder.andWhere('journal.ledgerId = :ledgerId', {
        ledgerId: options.ledgerId,
      });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    return queryBuilder.getManyAndCount();
  }

  /**
   * Busca journals por conta
   */
  async findByAccountId(
    accountId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<[Journal[], number]> {
    const queryBuilder = this.journalRepository
      .createQueryBuilder('journal')
      .innerJoin('journal.entries', 'entries')
      .where('entries.accountId = :accountId', { accountId })
      .leftJoinAndSelect('journal.entries', 'entriesFull')
      .leftJoinAndSelect('entriesFull.account', 'account')
      .orderBy('journal.createdAt', 'DESC')
      .distinct(true);

    if (options?.startDate) {
      queryBuilder.andWhere('journal.createdAt >= :startDate', {
        startDate: options.startDate,
      });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('journal.createdAt <= :endDate', {
        endDate: options.endDate,
      });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    return queryBuilder.getManyAndCount();
  }

  /**
   * Obtém totais de débito/crédito de uma conta
   */
  async getAccountTotals(
    accountId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ totalDebit: number; totalCredit: number; netAmount: number }> {
    const queryBuilder = this.entryRepository
      .createQueryBuilder('entry')
      .select('entry.side', 'side')
      .addSelect('SUM(entry.amount)', 'total')
      .where('entry.accountId = :accountId', { accountId })
      .andWhere(
        'entry.journalId IN (SELECT id FROM journals WHERE status = :status)',
        {
          status: JournalStatus.POSTED,
        },
      );

    if (startDate) {
      queryBuilder.andWhere('entry.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('entry.createdAt <= :endDate', { endDate });
    }

    queryBuilder.groupBy('entry.side');

    const results = await queryBuilder.getRawMany();

    let totalDebit = 0;
    let totalCredit = 0;

    for (const result of results) {
      if (result.side === EntrySide.DEBIT) {
        totalDebit = parseFloat(result.total || '0');
      } else if (result.side === EntrySide.CREDIT) {
        totalCredit = parseFloat(result.total || '0');
      }
    }

    return {
      totalDebit,
      totalCredit,
      netAmount: totalCredit - totalDebit,
    };
  }

  /**
   * Obtém saldo de uma conta em um momento específico
   */
  async getBalanceAtTime(
    accountId: string,
    timestamp: Date,
    currencyId?: string,
  ): Promise<number> {
    const queryBuilder = this.entryRepository
      .createQueryBuilder('entry')
      .select(
        'SUM(CASE WHEN side = :debit THEN amount ELSE -amount END)',
        'balance',
      )
      .where('entry.accountId = :accountId', { accountId })
      .andWhere('entry.createdAt <= :timestamp', { timestamp })
      .andWhere(
        'entry.journalId IN (SELECT id FROM journals WHERE status = :status)',
        {
          status: JournalStatus.POSTED,
        },
      )
      .setParameters({
        debit: EntrySide.DEBIT,
        timestamp,
        status: JournalStatus.POSTED,
      });

    if (currencyId) {
      queryBuilder.andWhere('entry.currencyId = :currencyId', { currencyId });
    }

    const result = await queryBuilder.getRawOne();
    return parseFloat(result?.balance || '0');
  }

  // ============================================
  // MÉTODOS DE ESTATÍSTICAS
  // ============================================

  /**
   * Obtém estatísticas de journals
   */
  async getJournalStats(options?: {
    startDate?: Date;
    endDate?: Date;
    ledgerId?: string;
  }): Promise<any> {
    const queryBuilder = this.journalRepository
      .createQueryBuilder('journal')
      .select('COUNT(*)', 'total')
      .addSelect('COUNT(CASE WHEN status = :posted THEN 1 END)', 'posted')
      .addSelect('COUNT(CASE WHEN status = :pending THEN 1 END)', 'pending')
      .addSelect('COUNT(CASE WHEN status = :reversed THEN 1 END)', 'reversed')
      .addSelect('COUNT(CASE WHEN status = :failed THEN 1 END)', 'failed')
      .setParameters({
        posted: JournalStatus.POSTED,
        pending: JournalStatus.PENDING,
        reversed: JournalStatus.REVERSED,
        failed: JournalStatus.FAILED,
      });

    if (options?.startDate) {
      queryBuilder.andWhere('journal.createdAt >= :startDate', {
        startDate: options.startDate,
      });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('journal.createdAt <= :endDate', {
        endDate: options.endDate,
      });
    }

    if (options?.ledgerId) {
      queryBuilder.andWhere('journal.ledgerId = :ledgerId', {
        ledgerId: options.ledgerId,
      });
    }

    const result = await queryBuilder.getRawOne();

    // Top tipos de journal
    const topTypes = await this.journalRepository
      .createQueryBuilder('journal')
      .select('type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('type')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    // Total movimentado no período
    const totalAmount = await this.entryRepository
      .createQueryBuilder('entry')
      .select('SUM(amount)', 'total')
      .where(
        'entry.journalId IN (SELECT id FROM journals WHERE status = :status)',
        {
          status: JournalStatus.POSTED,
        },
      )
      .getRawOne();

    return {
      total: parseInt(result?.total || '0'),
      posted: parseInt(result?.posted || '0'),
      pending: parseInt(result?.pending || '0'),
      reversed: parseInt(result?.reversed || '0'),
      failed: parseInt(result?.failed || '0'),
      topTypes: topTypes.map((t: any) => ({
        type: t.type,
        count: parseInt(t.count || '0'),
      })),
      totalAmount: parseFloat(totalAmount?.total || '0'),
    };
  }

  /**
   * Obtém volume de transações por período
   */
  async getVolumeByPeriod(
    period: 'day' | 'week' | 'month',
    ledgerId?: string,
  ): Promise<any[]> {
    let interval: string;
    switch (period) {
      case 'day':
        interval = '1 day';
        break;
      case 'week':
        interval = '1 week';
        break;
      case 'month':
        interval = '1 month';
        break;
    }

    const queryBuilder = this.journalRepository
      .createQueryBuilder('journal')
      .select(`DATE_TRUNC('${period}', journal.createdAt) as period`)
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(CASE WHEN status = :posted THEN 1 ELSE 0 END)', 'posted')
      .addSelect(
        'SUM(CASE WHEN status = :reversed THEN 1 ELSE 0 END)',
        'reversed',
      )
      .where('journal.createdAt >= NOW() - INTERVAL :interval', { interval })
      .setParameters({
        posted: JournalStatus.POSTED,
        reversed: JournalStatus.REVERSED,
        interval,
      })
      .groupBy(`DATE_TRUNC('${period}', journal.createdAt)`)
      .orderBy('period', 'DESC');

    if (ledgerId) {
      queryBuilder.andWhere('journal.ledgerId = :ledgerId', { ledgerId });
    }

    return queryBuilder.getRawMany();
  }

  // ============================================
  // MÉTODOS DE MANUTENÇÃO
  // ============================================

  /**
   * Limpa journals antigos (soft delete)
   */
  async cleanOldJournals(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.journalRepository
      .createQueryBuilder()
      .softDelete()
      .where('status IN (:...statuses)', {
        statuses: [JournalStatus.POSTED, JournalStatus.REVERSED],
      })
      .andWhere('postedAt < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(`Removidos ${result.affected || 0} journals antigos`);
    return result.affected || 0;
  }

  /**
   * Recupera journals que estão em estado pendente há muito tempo
   */
  async findStaleJournals(minutesStale: number = 5): Promise<Journal[]> {
    const staleDate = new Date();
    staleDate.setMinutes(staleDate.getMinutes() - minutesStale);

    return this.journalRepository.find({
      where: {
        status: JournalStatus.PENDING,
        createdAt: LessThan(staleDate),
      },
      relations: { entries: true },
    });
  }

  async createJournal(
    queryRunner: QueryRunner,
    options: Omit<CreateJournalOptions, 'journalNumber' | 'entries'> & {
      entries?: Omit<CreateEntryProps, 'journalId' | 'sequence'>[];
    },
  ): Promise<Journal> {
    const journal = Journal.create({
      ledgerId: options.ledgerId,
      journalNumber: await this.generateJournalNumber(),
      type: options.type,
      description: options.description,
      reference: options.reference,
      externalReference: options.externalReference,
      correlationId: options.correlationId,
      causationId: options.causationId,
      idempotencyKey: options.idempotencyKey,
      source: options.source,
      createdBy: options.createdBy,
      metadata: options.metadata,
      postedAt: options.postedAt,
    });
    const saved = await this.saveJournal(queryRunner, journal);
    saved.setEntries(
      options.entries?.map((entry, index) =>
        this.entryService.createEntry({
          ...entry,
          sequence: index + 1,
          journalId: saved.id,
          metadata: {},
        }),
      ) || [],
    );
    return saved;
  }

  async saveJournal(
    queryRunner: QueryRunner,
    journal: Journal,
  ): Promise<Journal> {
    return await queryRunner.manager.save(Journal, journal);
  }

  async validateJournalConsistency(): Promise<{
    difference: number;
    isBalanced: boolean;
    movementsByType: Record<
      string,
      { debit: number; credit: number; difference: number }
    >;
  }> {
    const debitCreditTotals = await this.entryRepository
      .createQueryBuilder('entry')
      .select('entry.side', 'side')
      .addSelect('SUM(entry.amount)', 'total')
      .innerJoin('entry.journal', 'journal')
      .where('journal.status = :status', { status: JournalStatus.POSTED })
      .groupBy('entry.side')
      .getRawMany();

    let totalDebit = 0;
    let totalCredit = 0;

    for (const result of debitCreditTotals) {
      if (result.side === EntrySide.DEBIT) {
        totalDebit = parseFloat(result.total || '0');
      } else if (result.side === EntrySide.CREDIT) {
        totalCredit = parseFloat(result.total || '0');
      }
    }

    const difference = Math.abs(totalDebit - totalCredit);
    const isBalanced = difference < 0.01;

    const movementsByType = await this.journalRepository
      .createQueryBuilder('journal')
      .select('journal.type', 'type')
      .addSelect(
        'SUM(CASE WHEN entry.side = :debit THEN entry.amount ELSE 0 END)',
        'debit',
      )
      .addSelect(
        'SUM(CASE WHEN entry.side = :credit THEN entry.amount ELSE 0 END)',
        'credit',
      )
      .innerJoin('journal.entries', 'entry')
      .where('journal.status = :status', { status: JournalStatus.POSTED })
      .groupBy('journal.type')
      .setParameters({ debit: EntrySide.DEBIT, credit: EntrySide.CREDIT })
      .getRawMany();

    const movementsByTypeMap: Record<
      string,
      { debit: number; credit: number; difference: number }
    > = {};
    for (const movement of movementsByType) {
      const debit = parseFloat(movement.debit || '0');
      const credit = parseFloat(movement.credit || '0');
      movementsByTypeMap[movement.type] = {
        debit,
        credit,
        difference: Math.abs(debit - credit),
      };
    }

    return {
      difference,
      isBalanced,
      movementsByType: movementsByTypeMap,
    };
  }

  async getLastJournal(): Promise<{
    journalNumber: string;
    createdAt: Date;
  } | null> {
    const lastJournal = await this.journalRepository.findOne({
      where: {
        journalNumber: Like(`JNL-%-%`),
      },
      order: { journalNumber: 'DESC' },
      select: {
        journalNumber: true,
        createdAt: true,
      },
    });

    return lastJournal;
  }
}
