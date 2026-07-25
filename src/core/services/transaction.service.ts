import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionStatus } from 'src/infra/database/common/enums/transaction.enum';
import { Transaction } from 'src/infra/database/entities/transaction.entity';
import { Repository } from 'typeorm';
import { QueryRunner } from 'typeorm/browser';
import { TransactionType } from 'src/infra/database/common/enums/transaction.enum';

export interface CreateTransactionOptions {
  type: TransactionType;
  amount: number;
  currencyId: string;
  originAccountId: string;
  destinationAccountId: string;
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
    return saved;
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

  async complete(queryRunner: QueryRunner, transactionId: string) {
    const transaction = await queryRunner.manager.findOne(Transaction, {
      where: { id: transactionId },
    });
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    transaction.status = TransactionStatus.COMPLETED;
    return await queryRunner.manager.save(transaction);
  }
}
