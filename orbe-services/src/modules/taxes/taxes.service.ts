import { Injectable } from '@nestjs/common';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { TaxService } from 'src/core/services/tax.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class TaxesService {
  private readonly logger = new Logger(TaxesService.name);

  constructor(private readonly taxService: TaxService) {}

  async create(createTaxDto: CreateTaxDto) {
    this.logger.log('Creating tax');
    return await this.taxService.createTax({
      code: createTaxDto.code,
      name: createTaxDto.name,
      description: createTaxDto.description,
      amount: createTaxDto.amount,
      type: createTaxDto.type,
      percentage: createTaxDto.percentage,
      minAmount: createTaxDto.minAmount,
      maxAmount: createTaxDto.maxAmount,
      isActive: createTaxDto.isActive ?? true,
      metadata: createTaxDto.metadata,
    });
  }

  async findAll(take: number = 10, offset: number = 0) {
    this.logger.log('Finding all taxes');
    const taxes = await this.taxService.findAllWithPagination(take, offset);
    const total = await this.taxService.countActiveTaxes();
    return {
      taxes,
      total,
      pages: Math.ceil(total / (take || 10)),
      page: Math.ceil(offset / (take || 10)) + 1,
    };
  }

  async findOne(id: string) {
    this.logger.log(`Finding tax with id: ${id}`);
    return await this.taxService.findOne(id);
  }

  async update(id: string, updateTaxDto: UpdateTaxDto) {
    this.logger.log(`Updating tax with id: ${id}`);
    return await this.taxService.updateTax(id, {
      code: updateTaxDto.code,
      name: updateTaxDto.name,
      description: updateTaxDto.description,
      amount: updateTaxDto.amount,
      type: updateTaxDto.type,
      percentage: updateTaxDto.percentage,
      minAmount: updateTaxDto.minAmount,
      maxAmount: updateTaxDto.maxAmount,
      isActive: updateTaxDto.isActive,
      metadata: updateTaxDto.metadata,
    });
  }

  async remove(id: string) {
    this.logger.log(`Soft deleting tax with id: ${id}`);
    return await this.taxService.softDeleteTax(id);
  }
}
