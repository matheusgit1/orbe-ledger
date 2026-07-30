import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityType } from 'src/infra/database/common/enums/idempotency.status';
import {
  CreateIdempotencyOptions,
  Idempotency,
} from 'src/infra/database/entities/idempotency.entity';
import { QueryRunner, Repository } from 'typeorm';

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

  async create(options: CreateIdempotencyOptions): Promise<Idempotency> {
    const idempotency = Idempotency.create({
      key: options.key,
      hash: options.hash,
      metadata: options.metadata,
      ttl: options.ttl,
      entityType: options.entityType,
      entityId: options.entityId,
      request: options.request,
      response: options.request,
    });
    idempotency.validate();
    return await this.idempotencyRepository.save(idempotency);
  }

  async createOrIgnore(
    options: CreateIdempotencyOptions,
  ): Promise<Idempotency> {
    const idempotency = await this.findByKey(options.key);
    if (idempotency) {
      return idempotency;
    }
    return await this.create(options);
  }

  async findByKey(key: string): Promise<Idempotency | null> {
    return await this.idempotencyRepository.findOne({ where: { key } });
  }

  async updateWithQueryRunner(
    queryRunner: QueryRunner,
    idempotency: Idempotency,
  ) {
    return await queryRunner.manager.save(Idempotency, idempotency);
  }

  async update(idempotency: Idempotency) {
    return await this.idempotencyRepository.save(idempotency);
  }
}
