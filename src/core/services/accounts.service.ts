import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Account } from '../../infra/database/entities/account.entity';
import { In, Repository } from 'typeorm';
import { QueryRunner } from 'typeorm/browser';
import { BalanceSnapshot } from 'src/infra/database/entities/balance-snapshot.entity';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private accountsRepository: Repository<Account>,
  ) {}

  async findAll(): Promise<Account[]> {
    return this.accountsRepository.find();
  }

  async findById(
    queryRunner: QueryRunner,
    id: string,
  ): Promise<Account | null> {
    const account = await queryRunner.manager.findOneOrFail(Account, {
      where: { id },
      relations: {
        balanceSnapshots: true,
        currency: true,
        limits: true,
      },
    });
    if (
      account &&
      (!account.balanceSnapshots || account.balanceSnapshots === null)
    ) {
      account.balanceSnapshots = BalanceSnapshot.createInitial(
        account.id,
        account.currencyId,
      );
    }
    // if(account && (!account.limits || account.limits === null)) {
    //   account.limits = Limit.createInitial(account.id);
    // }
    return account;
  }

  async lockAccountsByIds(
    queryRunner: QueryRunner,
    ids: string[],
  ): Promise<Account[] | null> {
    return await queryRunner.manager.find(Account, {
      where: { id: In(ids) },
    });
  }

  async countTotal(): Promise<number> {
    return this.accountsRepository.count();
  }

  async findByNumber(number: string): Promise<Account | null> {
    const account = await this.accountsRepository.findOneOrFail({
      where: { accountNumber: number },
      relations: {
        balanceSnapshots: true,
        currency: true,
        limits: true,
      },
    });
    if (
      account &&
      (!account.balanceSnapshots || account.balanceSnapshots === null)
    ) {
      account.balanceSnapshots = BalanceSnapshot.createInitial(
        account.id,
        account.currencyId,
      );
    }
    // if(account && (!account.limits || account.limits === null)) {
    //   account.limits = Limit.createInitial(account.id);
    // }
    return account;
  }

  async findByCode(code: string): Promise<Account> {
    const account = await this.accountsRepository.findOneOrFail({
      where: { code },
      relations: {
        balanceSnapshots: true,
        currency: true,
        limits: true,
      },
    });
    if (
      account &&
      (!account.balanceSnapshots || account.balanceSnapshots === null)
    ) {
      account.balanceSnapshots = BalanceSnapshot.createInitial(
        account.id,
        account.currencyId,
      );
    }
    // if(account && (!account.limits || account.limits === null)) {
    //   account.limits = Limit.createInitial(account.id);
    // }
    return account;
  }

  private async generateAccountNumber(): Promise<string> {
    const count = await this.countTotal();
    return String(count + 1).padStart(10, '0');
  }
}
