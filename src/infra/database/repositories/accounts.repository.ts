import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryRunner, Repository } from 'typeorm';
import { Account } from '../entities/account.entity';

@Injectable()
export class AccountsRepository {
  constructor(
    @InjectRepository(Account)
    private readonly repository: Repository<Account>,
  ) {}

  async findById(id: string): Promise<Account | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async findByCode(
    queryRunner: QueryRunner,
    code: string,
  ): Promise<Account | null> {
    return await queryRunner.manager.findOne(Account, { where: { code } });
  }

  async lockAccountsByIds(
    queryRunner: QueryRunner,
    ids: string[],
  ): Promise<Account[] | null> {
    return await queryRunner.manager.find(Account, {
      where: { id: In(ids) },
      lock: { mode: 'pessimistic_read' },
    });
  }
}
