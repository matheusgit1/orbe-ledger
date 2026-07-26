import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityType } from 'src/infra/database/common/enums/idempotency.status';
import { Idempotency } from 'src/infra/database/entities/idempotency.entity';
import { QueryRunner, Repository } from 'typeorm';

export interface CreateIdempotencyOptions {
  key: string;
  hash: string;
  data: Record<string, any>;
  ttl: number;
  entityType: EntityType;
  entityId: string;
}

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(Idempotency)
    private readonly idempotencyRepository: Repository<Idempotency>,
  ) {}

  async findTransactionByFilter({
    ...filters
  }: {
    entityId?: string;
    entityType?: EntityType;
    id?: string;
    key?: string;
  }): Promise<Idempotency | null> {
    return await this.idempotencyRepository.findOne({
      where: {
        ...filters,
      },
    });
  }

  async create(
    queryRunner: QueryRunner,
    options: CreateIdempotencyOptions,
  ): Promise<Idempotency> {
    const idempotency = Idempotency.create(
      options.key,
      options.hash,
      options.data,
      options.ttl,
      options.entityType,
      options.entityId,
    );
    idempotency.validate();
    return await queryRunner.manager.save(idempotency);
  }

  async findByKey(key: string): Promise<Idempotency | null> {
    return await this.idempotencyRepository.findOne({ where: { key } });
  }
}
