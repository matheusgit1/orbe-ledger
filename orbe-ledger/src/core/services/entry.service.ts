import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateEntryProps,
  Entry,
} from '../../infra/database/entities/entry.entity';
import { Repository } from 'typeorm';
import {
  EntrySide,
  JournalStatus,
} from 'src/infra/database/common/enums/journal.enum';
import { QueryRunner } from 'typeorm/browser';

// export interface CreateEntryOptions {
//   journalId: string;
//   accountId: string;
//   side: EntrySide;
//   amount: number;
//   currencyId: string;
//   sequence: number;
//   exchangeRate: number;
//   description?: string;
//   holdId?: string;
//   metadata?: Record<string, any>;
// }

@Injectable()
export class EntryService {
  constructor(
    @InjectRepository(Entry)
    private entryRepository: Repository<Entry>,
  ) {}

  createEntry(options: CreateEntryProps) {
    return Entry.create(options);
  }

  async saveEntry(queryRunner: QueryRunner, entry: Entry): Promise<Entry> {
    return await queryRunner.manager.save(Entry, entry);
  }

  async validateDebitAndCredits(entries: Entry[]): Promise<void> {
    Entry.validateDebitAndCredits(entries);
  }

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
}
