import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryRunner, Repository } from 'typeorm';
import { Account } from '../entities/account.entity';
import { BalanceSnapshot } from '../entities/balance-snapshot.entity';

@Injectable()
export class AccountsRepository {
  constructor(
    @InjectRepository(Account)
    private readonly repository: Repository<Account>,
  ) {}

  async findById(
    queryRunner: QueryRunner,
    id: string,
  ): Promise<Account | null> {
    const account = await queryRunner.manager.findOne(Account, {
      where: { id },
      relations: {
        balanceSnapshots: true,
        currency: true,
      },
    });
    if (
      account &&
      (!account.balanceSnapshots || account.balanceSnapshots.length === 0)
    ) {
      account.balanceSnapshots = [
        BalanceSnapshot.createInitial(account.id, account.currencyId),
      ];
    }
    return account;
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
    });
  }
}
