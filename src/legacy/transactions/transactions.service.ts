// src/core/transactions/services/transaction.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { OutboxService } from '../outbox/outbox.service';
import { AccountsService } from '../acounts/accounts.service';
import { JournalService } from '../journal/journal.service';
import { Transaction } from '../../infra/database/entities/transaction.entity';
import { TransactionStatus, TransactionType } from '../../infra/database/common/enums/transaction.enum';
import { OutboxEventType } from '../../infra/database/common/enums/outbox.enum';
import { AuditAction, AuditEntity } from '../../infra/database/common/enums/audit.enum';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { EntrySide } from '../../infra/database/common/enums/journal.enum';
import { HoldService } from '../hold/hold.service';
import { HoldReason } from '../../infra/database/common/enums/hold.enum';
import { Scope } from '@nestjs/common';


@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private journalService: JournalService,
    private accountService: AccountsService,
    private outboxService: OutboxService,
    private auditService: AuditService,
    private holdService: HoldService,
    private dataSource: DataSource,
  ) {}

  /**
   * Cria e executa uma transação completa
   */
  async createTransaction(createDto: CreateTransactionDto): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let transaction: Transaction | null = null;

    try {
      // 1. Valida contas
      const originAccount = await this.accountService.findById(createDto.originAccountId);
      const destinationAccount = await this.accountService.findById(createDto.destinationAccountId);

      if(!originAccount || !destinationAccount) {
        throw new BadRequestException('Account not found');
      }

      // 2. Verifica saldo disponível
      const availableBalance = await this.journalService.getBalanceAtTime(
        originAccount.id,
        new Date()
      );

      const heldBalance = await this.holdService.getHeldBalance(originAccount.id);
      const realAvailableBalance = availableBalance - heldBalance;

      if (realAvailableBalance < createDto.amount) {
        throw new BadRequestException(
          `Insufficient balance. Available: ${realAvailableBalance}, Required: ${createDto.amount}, Held: ${heldBalance}`
        );
      }

      // 3. Cria a transação
      transaction = this.transactionRepository.create({
        type: createDto.type,
        status: TransactionStatus.PROCESSING,
        amount: createDto.amount,
        currencyId: originAccount.currencyId,
        originAccountId: originAccount.id,
        destinationAccountId: destinationAccount.id,
        correlationId: createDto.correlationId,
        externalId: createDto.externalId,
        metadata: createDto.metadata,
        startedAt: new Date(),
      });

      transaction.validate();
      await queryRunner.manager.save(transaction);

      // 4. Cria o journal com as entries
      const journal = await this.journalService.createJournal({
        ledgerId: originAccount.ledgerId,
        type: this.mapTransactionTypeToJournalType(createDto.type),
        description: `Transaction ${transaction.id}`,
        reference: createDto.reference,
        externalReference: createDto.externalId,
        correlationId: transaction.id,
        source: 'TRANSACTION_SERVICE',
        createdBy: 'SYSTEM',
        entries: [
          {
            accountId: originAccount.id,
            side: EntrySide.DEBIT,
            amount: createDto.amount,
            currencyId: originAccount.currencyId,
            description: `Debit from ${originAccount.name}`,
          },
          {
            accountId: destinationAccount.id,
            side: EntrySide.CREDIT,
            amount: createDto.amount,
            currencyId: destinationAccount.currencyId,
            description: `Credit to ${destinationAccount.name}`,
          },
        ],
        metadata: { transactionId: transaction.id },
      });

      // 5. Atualiza status da transação
      transaction.status = TransactionStatus.COMPLETED;
      transaction.completedAt = new Date();
      await queryRunner.manager.save(transaction);

      // 6. Cria eventos no outbox
      await this.outboxService.createEvent(
        'TRANSACTION',
        transaction.id,
        OutboxEventType.TRANSACTION_COMPLETED,
        {
          transactionId: transaction.id,
          amount: transaction.amount,
          originAccountId: originAccount.id,
          destinationAccountId: destinationAccount.id,
          journalId: journal.id,
        }
      );

      // 7. Audit log
      await this.auditService.createLog(
        AuditEntity.TRANSACTION,
        transaction.id,
        AuditAction.CREATE,
        'SYSTEM',
        null,
        transaction,
        { journalId: journal.id }
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Transaction ${transaction.id} completed successfully`);
      return transaction;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Transaction failed: ${error.message}`);
      
      // Cria log de falha se a transação foi criada
      if (transaction) {
        transaction.status = TransactionStatus.FAILED;
        transaction.errorDetails = {
          error: error.message,
          timestamp: new Date().toISOString(),
        };
        await this.transactionRepository.save(transaction);

        await this.outboxService.createEvent(
          'TRANSACTION',
          transaction.id,
          OutboxEventType.TRANSACTION_FAILED,
          {
            transactionId: transaction.id,
            error: error.message,
          }
        );
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Cria uma transação com hold (pré-autorização)
   */
  async createHeldTransaction(
    createDto: CreateTransactionDto,
    holdDurationSeconds: number = 300
  ): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let transaction: Transaction | null = null;

    try {
      const originAccount = await this.accountService.findById(createDto.originAccountId);
      const destinationAccount = await this.accountService.findById(createDto.destinationAccountId);

      if(!originAccount || !destinationAccount) {
        throw new BadRequestException('Account not found');
      }

      // Cria a transação
      transaction = this.transactionRepository.create({
        type: createDto.type,
        status: TransactionStatus.PENDING,
        amount: createDto.amount,
        currencyId: originAccount.currencyId,
        originAccountId: originAccount.id,
        destinationAccountId: destinationAccount.id,
        correlationId: createDto.correlationId,
        externalId: createDto.externalId,
        metadata: createDto.metadata,
        startedAt: new Date(),
      });

      transaction.validate();
      await queryRunner.manager.save(transaction);

      // Cria um hold na conta de origem
      const hold = await this.holdService.createHold(
        {
          accountId: originAccount.id,
          amount: createDto.amount,
          reason: HoldReason.CARD_AUTHORIZATION,
          metadata: { transactionId: transaction.id },
        }
      );

      // Atualiza a transação com o hold
      transaction.metadata = {
        ...transaction.metadata,
        holdId: hold.id,
      };
      await queryRunner.manager.save(transaction);

      // Cria evento de hold
      await this.outboxService.createEvent(
        'HOLD',
        hold.id,
        OutboxEventType.HOLD_CREATED,
        {
          holdId: hold.id,
          transactionId: transaction.id,
          amount: hold.amount,
          accountId: originAccount.id,
          expiresAt: hold.expiresAt,
        }
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Held transaction ${transaction.id} created successfully`);
      return transaction;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Held transaction failed: ${error.message}`);
      
      if (transaction) {
        transaction.status = TransactionStatus.FAILED;
        transaction.errorDetails = {
          error: error.message,
          timestamp: new Date().toISOString(),
        };
        await this.transactionRepository.save(transaction);
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Captura uma transação com hold (completa a transação)
   */
  async captureHeldTransaction(transactionId: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: {
        originAccount: true,
        destinationAccount: true,
      },
    });

    if (!transaction) {
      throw new BadRequestException(`Transaction ${transactionId} not found`);
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException(
        `Transaction ${transactionId} is not pending. Current status: ${transaction.status}`
      );
    }

    const holdId = transaction.metadata?.holdId;
    if (!holdId) {
      throw new BadRequestException(`Transaction ${transactionId} has no associated hold`);
    }

    // Verifica se o hold ainda está ativo
    const hold = await this.holdService.findById(holdId);
    if (!hold.isActive()) {
      throw new BadRequestException(`Hold ${holdId} is not active. Status: ${hold.status}`);
    }

    // Captura o hold
    await this.holdService.captureHold(holdId, transaction.amount);

    // Completa a transação
    const completedTransaction = await this.createTransaction({
      type: transaction.type,
      amount: transaction.amount,
      originAccountId: transaction.originAccountId,
      destinationAccountId: transaction.destinationAccountId,
      currencyId: transaction.currencyId,
      correlationId: transaction.correlationId,
      externalId: transaction.externalId,
      reference: transaction.metadata?.reference,
      metadata: {
        ...transaction.metadata,
        capturedFromHold: true,
        holdId: holdId,
      },
    });

    return completedTransaction;
  }

  /**
   * Reverte uma transação
   */
  async reverseTransaction(transactionId: string, reason: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: {
        journals: true,
      },
    });

    if (!transaction) {
      throw new BadRequestException(`Transaction ${transactionId} not found`);
    }

    if (!transaction.isCompleted()) {
      throw new BadRequestException(`Transaction ${transactionId} is not completed`);
    }

    // Reverte o journal associado
    const journal = transaction.journals?.[0];
    if (journal) {
      await this.journalService.reverseJournal(journal.id, reason);
    }

    // Se tiver hold, libera
    if (transaction.metadata?.holdId) {
      await this.holdService.releaseHold(transaction.metadata.holdId, `Transaction reversed: ${reason}`);
    }

    // Atualiza status
    transaction.status = TransactionStatus.REVERSED;
    await this.transactionRepository.save(transaction);

    // Audit log
    await this.auditService.createLog(
      AuditEntity.TRANSACTION,
      transaction.id,
      AuditAction.REVERSE,
      'SYSTEM',
      { status: TransactionStatus.COMPLETED },
      { status: TransactionStatus.REVERSED },
      { reason }
    );

    // Evento de reversão
    await this.outboxService.createEvent(
      'TRANSACTION',
      transaction.id,
      OutboxEventType.TRANSACTION_COMPLETED,
      {
        transactionId: transaction.id,
        reversed: true,
        reason,
      }
    );

    return transaction;
  }

  /**
   * Busca transação por ID
   */
  async findById(id: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: {
        originAccount: true,
        destinationAccount: true,
        journals: true,
        holds: true,
      },
    });

    if (!transaction) {
      throw new BadRequestException(`Transaction ${id} not found`);
    }

    return transaction;
  }

  /**
   * Busca transações por conta
   */
  async findByAccountId(
    accountId: string,
    options?: { limit?: number; offset?: number; status?: TransactionStatus }
  ): Promise<[Transaction[], number]> {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.originAccountId = :accountId OR transaction.destinationAccountId = :accountId', {
        accountId,
      })
      .leftJoinAndSelect('transaction.originAccount', 'originAccount')
      .leftJoinAndSelect('transaction.destinationAccount', 'destinationAccount')
      .leftJoinAndSelect('transaction.journals', 'journals')
      .orderBy('transaction.createdAt', 'DESC');

    if (options?.status) {
      queryBuilder.andWhere('transaction.status = :status', { status: options.status });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    return queryBuilder.getManyAndCount();
  }

  /**
   * Busca transações por período
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    options?: { limit?: number; offset?: number }
  ): Promise<[Transaction[], number]> {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .leftJoinAndSelect('transaction.originAccount', 'originAccount')
      .leftJoinAndSelect('transaction.destinationAccount', 'destinationAccount')
      .leftJoinAndSelect('transaction.journals', 'journals')
      .orderBy('transaction.createdAt', 'DESC');

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    return queryBuilder.getManyAndCount();
  }

  /**
   * Obtém estatísticas de transações
   */
  async getTransactionStats(accountId: string, period: 'day' | 'week' | 'month'): Promise<any> {
    let startDate: Date;
    const now = new Date();

    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 1));
    }

    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN status = :completed THEN 1 ELSE 0 END)', 'completed')
      .addSelect('SUM(CASE WHEN status = :failed THEN 1 ELSE 0 END)', 'failed')
      .addSelect('SUM(CASE WHEN status = :pending THEN 1 ELSE 0 END)', 'pending')
      .addSelect('SUM(amount)', 'totalAmount')
      .where('(originAccountId = :accountId OR destinationAccountId = :accountId)', { accountId })
      .andWhere('createdAt >= :startDate', { startDate })
      .setParameters({
        completed: TransactionStatus.COMPLETED,
        failed: TransactionStatus.FAILED,
        pending: TransactionStatus.PENDING,
      })
      .getRawOne();

    return {
      period,
      startDate,
      ...result,
    };
  }

  /**
   * Mapeia tipo de transação para tipo de journal
   */
  private mapTransactionTypeToJournalType(transactionType: TransactionType): any {
    const mapping = {
      [TransactionType.PIX]: 'PIX',
      [TransactionType.TED]: 'TED',
      [TransactionType.DOC]: 'DOC',
      [TransactionType.BOLETO]: 'BOLETO',
      [TransactionType.CARD]: 'CARD',
      [TransactionType.INVESTMENT]: 'INVESTMENT',
      [TransactionType.FEE]: 'FEE',
      [TransactionType.REFUND]: 'REFUND',
      [TransactionType.REVERSAL]: 'REVERSAL',
      [TransactionType.ADJUSTMENT]: 'ADJUSTMENT',
      [TransactionType.CASHBACK]: 'CASHBACK',
      [TransactionType.SETTLEMENT]: 'SETTLEMENT',
      [TransactionType.TRANSFER]: 'TRANSFER',
    };

    const mappedType = mapping[transactionType];
    if (!mappedType) {
      throw new Error(`Unknown transaction type: ${transactionType}`);
    }

    return mappedType;
  }
}