import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LedgerCode } from 'src/infra/database/common/enums/ledger.enum';
import { Ledger } from 'src/infra/database/entities/ledger.entity';
import { Repository } from 'typeorm';

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(Ledger)
    private readonly ledgerRepository: Repository<Ledger>,
  ) {}

  async getLedgerByCode(code: LedgerCode): Promise<Ledger> {
    const ledger = await this.ledgerRepository.findOne({ where: { code } });
    if (!ledger) {
      throw new Error('Ledger not found');
    }
    return ledger;
  }
}
