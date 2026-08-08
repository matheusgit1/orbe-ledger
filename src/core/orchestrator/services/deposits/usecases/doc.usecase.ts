import { Injectable, Logger } from '@nestjs/common';
import { LedgerPosting } from 'src/core/posting/ledger.posting';
import { LedgerPostingStrategy } from 'src/core/posting/ledger.posting.strategy';
import { IdempotencyRules } from 'src/core/rules/business/idempotency.rules';
import { AccountsService } from 'src/core/services/accounts.service';
import { AuditService } from 'src/core/services/audit.service';
import { IdempotencyService } from 'src/core/services/idempotency.service';
import { TransactionService } from 'src/core/services/transaction.service';
import { EntityType } from 'src/infra/database/common/enums/idempotency.status';
import { TransactionType } from 'src/infra/database/common/enums/transaction.enum';
import { Account } from 'src/infra/database/entities/account.entity';
import { Journal } from 'src/infra/database/entities/journal.entity';
import { Ledger } from 'src/infra/database/entities/ledger.entity';
import { Service } from 'src/infra/database/entities/service.entity';
import { Transaction } from 'src/infra/database/entities/transaction.entity';
import { OrmService } from 'src/infra/database/orm/orm.service';

@Injectable()
export class DocUsecase {
  private logger = new Logger(DocUsecase.name);
  constructor(
    private ormService: OrmService,
    private accountService: AccountsService,
    private idempotencyRules: IdempotencyRules,
    private transactionService: TransactionService,
    private idempotencyService: IdempotencyService,
    private ledgerPostingStrategy: LedgerPostingStrategy,
  ) {}

  async handler(body: {
    payerAccount: Account;
    receiverAccount: Account;
    revenueAccount: Account;
    ledger: Ledger;
    service: Service;
    idempotencyKey: string;
    requestId: string;
    amount: number;
    tax: number;
  }) {
    const { queryRunner } = await this.ormService.getQueryRunner();
    try {
      await this.accountService.lockAccountsByIds(queryRunner, [
        body.receiverAccount.id,
      ]);

      const idempotencyResult = await this.idempotencyRules.validate({
        key: body.idempotencyKey,
        requestId: body.requestId,
      });

      const savedTransaction = await this.transactionService.createTransaction({
        type: TransactionType.DOC,
        amount: body.amount,
        currencyId: body.receiverAccount.currencyId,
        originAccountId: body.payerAccount.id,
        destinationAccountId: body.receiverAccount.id,
        correlationId: body.idempotencyKey,
        externalId: body.idempotencyKey,
        metadata: {
          pixKey: body.idempotencyKey,
          description: 'DOC Settlement',
          institutionType: 'CROSS INSTITUTION',
          startedAt: new Date().toISOString(),
          data: body,
        },
      });

      const idempotency =
        idempotencyResult ??
        (await this.idempotencyService.create({
          key: body.idempotencyKey,
          hash: body.requestId,
          request: { ...body },
          metadata: { created_by: 'SYTEM', type: 'DOC' },
          ttl: 86400,
          entityType: EntityType.TRANSACTION,
          entityId: savedTransaction.id,
        }));

      const journal = await this.ledgerPostingStrategy.runEstategy({
        queryRunner,
        type: 'DOC',
        data: {
          ledger: body.ledger,
          transaction: savedTransaction,
          description: 'Liquidação via doc',
          idempotencyKey: body.idempotencyKey,
          amount: body.amount,
          tax: body.tax,
          payerAccount: body.payerAccount,
          receiverAccount: body.receiverAccount,
          revenueAccount: body.revenueAccount,
          requestId: body.requestId,
          service: body.service,
        },
      });

      await this.transactionService.complete(queryRunner, savedTransaction);

      const resp = this.buildResponse(savedTransaction, journal, body.tax);

      await this.idempotencyService.updateWithQueryRunner(
        queryRunner,
        idempotency.setAsCompleted(resp),
      );

      await this.ormService.commit(queryRunner);

      this.logger.log(
        `[${body.requestId}] PIX (mesma instituição) concluído com sucesso`,
      );

      return resp;
    } catch (error) {
      await this.ormService.rollback(queryRunner);
      throw error;
    } finally {
      await this.ormService.release(queryRunner);
    }
  }

  private buildResponse(
    transaction: Transaction,
    journal: Journal,
    tax: number = 0,
  ): any {
    return {
      transactionId: transaction.id,
      journalId: journal.id,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currencyId,
      payerAccount: transaction.originAccountId,
      receiverAccount: transaction.destinationAccountId,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      tax: tax,
    };
  }
}
