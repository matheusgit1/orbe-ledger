import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Entry } from '../../infra/database/entities/entry.entity';
import { Repository } from 'typeorm';
import { EntrySide } from 'src/infra/database/common/enums/journal.enum';
import { QueryRunner } from 'typeorm/browser';

export interface CreateEntryOptions {
  journalId: string;
  accountId: string;
  side: EntrySide;
  amount: number;
  currencyId: string;
  sequence: number;
  exchangeRate: number;
  description: string;
  holdId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class EntryService {
  constructor(
    @InjectRepository(Entry)
    private entryRepository: Repository<Entry>,
  ) {}

  createEntry(options: CreateEntryOptions) {
    return Entry.create(options);
  }

  async saveEntry(queryRunner: QueryRunner, entry: Entry) {
    return await queryRunner.manager.save(Entry, entry);
  }
}
