import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Limit } from 'src/infra/database/entities/limit.entity';
import { Repository } from 'typeorm';
import { QueryRunner } from 'typeorm/browser';

@Injectable()
export class LimiteService {
  constructor(
    @InjectRepository(Limit)
    private readonly limitRepository: Repository<Limit>,
  ) {}

  async findByFilters(
    queryRunner: QueryRunner,
    filters: {
      accountId?: string;
      id?: string;
    },
  ): Promise<Limit | null> {
    return queryRunner.manager.findOne(Limit, {
      where: filters,
      // lock: { mode: 'pessimistic_read' },
    });
  }
}
