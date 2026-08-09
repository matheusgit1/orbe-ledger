import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateTaxOptions, Tax } from 'src/infra/database/entities/tax.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TaxService {
  constructor(
    @InjectRepository(Tax)
    private readonly taxRepository: Repository<Tax>,
  ) {}

  async createTax(options: CreateTaxOptions): Promise<Tax> {
    const tax = Tax.create(options);
    return await this.taxRepository.save(tax);
  }

  async findAllWithPagination(take: number = 10, offset: number = 0) {
    return await this.taxRepository.find({
      where: {
        isActive: true,
      },
      relations: {
        services: true,
      },
      order: {
        createdAt: 'ASC',
      },
      take,
      skip: offset,
    });
  }

  async findOne(id: string) {
    return await this.taxRepository.findOneOrFail({
      where: { id, isActive: true },
      relations: {
        services: true,
      },
    });
  }

  async updateTax(
    id: string,
    options: Partial<CreateTaxOptions>,
  ): Promise<Tax> {
    const tax = await this.taxRepository.findOneOrFail({
      where: { id },
      relations: { services: true },
    });

    if (options.code !== undefined) tax.code = options.code;
    if (options.name !== undefined) tax.name = options.name;
    if (options.description !== undefined)
      tax.description = options.description;
    if (options.amount !== undefined) tax.amount = options.amount;
    if (options.type !== undefined) tax.type = options.type;
    if (options.percentage !== undefined) tax.percentage = options.percentage;
    if (options.minAmount !== undefined) tax.minAmount = options.minAmount;
    if (options.maxAmount !== undefined) tax.maxAmount = options.maxAmount;
    if (options.isActive !== undefined) tax.isActive = options.isActive;
    if (options.metadata !== undefined) tax.metadata = options.metadata;

    return await this.taxRepository.save(tax);
  }

  async softDeleteTax(id: string): Promise<Tax> {
    const tax = await this.taxRepository.findOneOrFail({
      where: { id },
      relations: { services: true },
    });

    tax.isActive = false;
    return await this.taxRepository.save(tax);
  }

  async countActiveTaxes() {
    return await this.taxRepository.count({
      where: {
        isActive: true,
      },
    });
  }
}
