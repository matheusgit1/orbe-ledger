// src/core/services/balance.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BalanceSnapshot } from '../../infra/database/entities/balance-snapshot.entity';
import { QueryRunner } from 'typeorm/browser';

@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name);

  constructor(
    @InjectRepository(BalanceSnapshot)
    private balanceSnapshotRepository: Repository<BalanceSnapshot>,
  ) {}

  async getAvailableBalance(
    queryRunner: QueryRunner,
    accountId: string,
    currencyId: string,
  ): Promise<number> {
    const snapshot = await queryRunner.manager.findOne(BalanceSnapshot, {
      where: { accountId, currencyId },
      order: { version: 'DESC' },
      // lock: { mode: 'pessimistic_read' },
    });

    if (!snapshot) {
      return 0;
    }

    return snapshot.available;
  }

  async getBookBalance(
    queryRunner: QueryRunner,
    accountId: string,
    currencyId: string,
  ): Promise<number> {
    const snapshot = await queryRunner.manager.findOne(BalanceSnapshot, {
      where: { accountId, currencyId },
      order: { version: 'DESC' },
    });

    if (!snapshot) {
      return 0;
    }

    return snapshot.book;
  }

  async getHeldBalance(
    queryRunner: QueryRunner,
    accountId: string,
    currencyId: string,
  ): Promise<number> {
    const snapshot = await queryRunner.manager.findOne(BalanceSnapshot, {
      where: { accountId, currencyId },
      order: { version: 'DESC' },
    });

    if (!snapshot) {
      return 0;
    }

    return snapshot.held;
  }
}
