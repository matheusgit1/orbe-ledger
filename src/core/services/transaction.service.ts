import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionStatus } from 'src/infra/database/common/enums/transaction.enum';
import { Transaction } from 'src/infra/database/entities/transaction.entity';
import { Repository } from 'typeorm';
import { QueryRunner } from 'typeorm/browser';
import { TransactionType } from 'src/infra/database/common/enums/transaction.enum';
import { EntityType } from 'src/infra/database/common/enums/idempotency.status';

export interface CreateTransactionOptions {
  type: TransactionType;
  amount: number;
  currencyId: string;
  originAccountId: string;
  destinationAccountId?: string;
  correlationId?: string;
  externalId?: string;
  workflowId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async createTransaction(options: CreateTransactionOptions) {
    const transaction = Transaction.create({
      type: options.type,
      amount: options.amount,
      currencyId: options.currencyId,
      originAccountId: options.originAccountId,
      destinationAccountId: options.destinationAccountId,
      correlationId: options.correlationId,
      externalId: options.externalId,
      metadata: {
        pixKey: options.externalId,
        description: options.metadata?.description,
        institutionType: 'SAME_INSTITUTION',
        startedAt: new Date().toISOString(),
      },
    });
    const saved = await this.transactionRepository.save(transaction);

    return await this.transactionRepository.findOneOrFail({
      where: {
        id: saved.id,
      },
      relations: {
        journals: true,
        originAccount: true,
        destinationAccount: true,
        currency: true
      },
    });
  }

  async saveTransaction(queryRunner: QueryRunner, transaction: Transaction) {
    return await queryRunner.manager.save(transaction);
  }

  async updateStatus(queryRunner: QueryRunner, transaction: Transaction) {
    return await queryRunner.manager.save(transaction);
  }

  async findTransactionById(id: string) {
    return await this.transactionRepository.findOne({ where: { id } });
  }

  async findTransactionByFilter({
    ...filters
  }: {
    correlationId?: string;
    id?: string;
  }) {
    return await this.transactionRepository.findOne({
      where: {
        ...filters,
      },
      relations: {
        journals: {
          entries: true,
        },
        originAccount: true,
        destinationAccount: true,
      },
    });
  }

  async complete(queryRunner: QueryRunner, transaction: Transaction) {
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    transaction.complete();
    return await queryRunner.manager.save(transaction);
  }
}
