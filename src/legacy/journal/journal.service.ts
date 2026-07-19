// src/core/journals/services/journal.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { CreateJournalDto } from './dto/create-journal.dto';
import { Journal } from '../../infra/database/entities/journal.entity';
import { BalanceSnapshot } from '../../infra/database/entities/balance-snapshot.entity';
import { Entry } from '../../infra/database/entities/entry.entity';
import { EntrySide, JournalStatus, JournalType } from '../../infra/database/common/enums/journal.enum';
import { AccountsService } from '../acounts/accounts.service';



@Injectable()
export class JournalService {
  private readonly logger = new Logger(JournalService.name);

  constructor(
    @InjectRepository(Journal)
    private journalRepository: Repository<Journal>,
    @InjectRepository(Entry)
    private entryRepository: Repository<Entry>,
    private accountService: AccountsService,
    private dataSource: DataSource,
  ) {}

  /**
   * Cria um journal completo com suas entries
   * Usa transação para garantir consistência
   */
  async createJournal(createJournalDto: CreateJournalDto): Promise<Journal> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Cria o journal
    const journal = this.journalRepository.create({
      ...createJournalDto,
      journalNumber: await this.generateJournalNumber(),
      status: JournalStatus.PENDING,
      postedAt: new Date(),
    });

    await queryRunner.manager.save(journal);

    // 2. Cria as entries com o journalId definido
    const entries = createJournalDto.entries.map((entryDto, index) => {
      const entry = this.entryRepository.create({
        ...entryDto,
        journalId: journal.id, // ✅ ESSENCIAL: definir o journalId
        sequence: index + 1,
        exchangeRate: entryDto.exchangeRate || 1,
      });
      entry.validate();
      return entry;
    });

    // 3. Salva as entries
    await queryRunner.manager.save(entries);

    // 4. Atualiza o journal com as entries
    journal.entries = entries;
    journal.validate();

    await queryRunner.commitTransaction();

    this.logger.log(`Journal ${journal.journalNumber} created successfully`);
    return journal;

  } catch (error) {
    await queryRunner.rollbackTransaction();
    this.logger.error(`Failed to create journal: ${error.message}`);
    throw new BadRequestException(`Failed to create journal: ${error.message}`);
  } finally {
    await queryRunner.release();
  }
}

  /**
   * Reverte um journal já postado (append-only)
   */
  async reverseJournal(journalId: string, reason: string): Promise<Journal> {
    const originalJournal = await this.journalRepository.findOne({
      where: { id: journalId },
      relations: { entries: { account: true } },
    });

    if (!originalJournal) {
      throw new BadRequestException(`Journal ${journalId} not found`);
    }

    if (!originalJournal.canBeReversed()) {
      throw new BadRequestException(`Journal ${originalJournal.journalNumber} cannot be reversed`);
    }

    // Cria um journal de reversão
    const reverseJournal = await this.createJournal({
      ledgerId: originalJournal.ledgerId,
      type: JournalType.REVERSAL,
      description: `Reversal of ${originalJournal.journalNumber}: ${reason}`,
      reference: originalJournal.reference,
      correlationId: originalJournal.correlationId,
      causationId: originalJournal.id,
      source: 'SYSTEM',
      createdBy: 'SYSTEM',
      entries: originalJournal.entries.map(entry => ({
        accountId: entry.accountId,
        side: entry.side === EntrySide.DEBIT ? EntrySide.CREDIT : EntrySide.DEBIT,
        amount: entry.amount,
        currencyId: entry.currencyId,
        exchangeRate: entry.exchangeRate,
        description: `Reversal of entry ${entry.id}`,
        metadata: { originalEntryId: entry.id },
      })),
      metadata: { originalJournalId: originalJournal.id },
    });

    // Marca o journal original como revertido
    originalJournal.status = JournalStatus.REVERSED;
    await this.journalRepository.save(originalJournal);

    return reverseJournal;
  }

  /**
   * Obtém o saldo de uma conta em um ponto específico do tempo
   */
  async getBalanceAtTime(accountId: string, timestamp: Date): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT * FROM get_account_balance_at_time($1, $2)`,
      [accountId, timestamp]
    );
    return result[0]?.balance || 0;
  }

  /**
   * Atualiza os balance snapshots após novas entries
   */
  private async updateBalanceSnapshots(
    entries: Entry[],
    queryRunner: QueryRunner
  ): Promise<void> {
    const accountIds = [...new Set(entries.map(e => e.accountId))];

    for (const accountId of accountIds) {
      const accountEntries = entries.filter(e => e.accountId === accountId);
      
      // Busca ou cria snapshot
      let snapshot = await queryRunner.manager.findOne(BalanceSnapshot, {
        where: { accountId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!snapshot) {
        const account = await this.accountService.findById(accountId);
        if (!account) {
          throw new Error('Account not found');
        }
        snapshot = BalanceSnapshot.createInitial(
          accountId,
          account.currencyId
        );
      }

      // Aplica cada entry ao snapshot
      for (const entry of accountEntries) {
        snapshot.updateBalances(entry);
      }

      snapshot.validate();
      await queryRunner.manager.save(snapshot);
    }
  }

  /**
   * Valida as entries de um journal
   */
  private validateEntries(entries: any[], journal: Journal): void {
    if (!entries || entries.length < 2) {
      throw new Error('Journal must have at least 2 entries');
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      if (entry.side === EntrySide.DEBIT) {
        totalDebit += entry.amount;
      } else if (entry.side === EntrySide.CREDIT) {
        totalCredit += entry.amount;
      } else {
        throw new Error(`Invalid entry side: ${entry.side}`);
      }
    }

    if (totalDebit !== totalCredit) {
      throw new Error(
        `Journal not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`
      );
    }
  }

  /**
   * Gera número sequencial para journal
   * Formato: {PREFIX}-{YYYYMMDD}-{SEQUENCE}
   */
  private async generateJournalNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const lastJournal = await this.journalRepository.findOne({
      where: {
        journalNumber: `JRN-${dateStr}-%`,
      },
      order: { journalNumber: 'DESC' },
    });

    let sequence = 1;
    if (lastJournal) {
      const parts = lastJournal.journalNumber.split('-');
      sequence = parseInt(parts[2], 10) + 1;
    }

    return `JRN-${dateStr}-${String(sequence).padStart(6, '0')}`;
  }
}