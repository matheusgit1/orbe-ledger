import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Currency } from 'src/infra/database/entities/currency.entity';
import { Repository } from 'typeorm/browser';

@Injectable()
export class CurrencyService {
  constructor(
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
  ) {}

  async getCurrencyByCode(code: string): Promise<Currency | null> {
    return await this.currencyRepository.findOne({ where: { code } });
  }

  async findByFilters(filters: {
    code?: string;
    id?: string;
  }): Promise<Currency | null> {
    return await this.currencyRepository.findOne({ where: { ...filters } });
  }
}
