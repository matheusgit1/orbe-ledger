import { Injectable, Logger } from '@nestjs/common';
import { LedgerPosting } from 'src/core/posting/ledger.posting';
import { LedgerPostingStrategy } from 'src/core/posting/ledger.posting.strategy';
import { IdempotencyRules } from 'src/core/rules/business/idempotency.rules';
import { TransferRules } from 'src/core/rules/business/transfer.rules';
import { AccountsService } from 'src/core/services/accounts.service';
import { HoldService } from 'src/core/services/hold.service';
import { IdempotencyService } from 'src/core/services/idempotency.service';
import { TransactionService } from 'src/core/services/transaction.service';
import { HoldReason } from 'src/infra/database/common/enums/hold.enum';
import { EntityType } from 'src/infra/database/common/enums/idempotency.status';
import { TransactionType } from 'src/infra/database/common/enums/transaction.enum';
import { Account } from 'src/infra/database/entities/account.entity';
import { Hold } from 'src/infra/database/entities/hold.entity';
import { Journal } from 'src/infra/database/entities/journal.entity';
import { Ledger } from 'src/infra/database/entities/ledger.entity';
import { Transaction } from 'src/infra/database/entities/transaction.entity';
import { OrmService } from 'src/infra/database/orm/orm.service';

@Injectable()
export class CreateHoldUsecase {
  private logger = new Logger(CreateHoldUsecase.name);
  constructor(
    private readonly ormService: OrmService,
    private accountService: AccountsService,
    private idempotencyService: IdempotencyService,
    private idempotencyRules: IdempotencyRules,
    private transactionService: TransactionService,
    private transferRules: TransferRules,
    // private ledgerPostingSerive: LedgerPosting,
    private ledgerPostingStrategy: LedgerPostingStrategy,
    private holdService: HoldService,
  ) {}

  async handler(body: {
    payerAccount: Account;
    receiverAccount: Account;
    idempotencyKey: string;
    requestId: string;
    amount: number;
    ledger: Ledger;
  }) {
    this.logger.log('hold usecase runnning');
    const { queryRunner } = await this.ormService.getQueryRunner();
    try {
      await this.accountService.lockAccountsByIds(queryRunner, [
        body.payerAccount.id,
        body.receiverAccount.id,
      ]);

      await this.transferRules.validate({
        payerAccount: body.payerAccount,
        receiverAccount: body.receiverAccount,
        amount: body.amount,
      });

      const idempotencyResult = await this.idempotencyRules.validate({
        key: body.idempotencyKey,
        requestId: body.requestId,
      });

      const savedTransaction = await this.transactionService.createTransaction({
        type: TransactionType.HOLD,
        amount: body.amount,
        currencyId: body.payerAccount.currencyId,
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

      const hold = await this.holdService.createHold({
        accountId: body.payerAccount.id,
        amount: body.amount,
        currencyId: body.payerAccount.currencyId,
        reason: HoldReason.RESERVATION,
        expiresInSeconds: 300,
        metadata: {
          transactionId: savedTransaction.id,
          description: 'aprisionamento fluxo hold',
        },
      });

      const journal = await this.ledgerPostingStrategy.runEstategy({
        type: 'HOLD',
        queryRunner: queryRunner,
        data: {
          ledger: body.ledger,
          transaction: savedTransaction,
          description: 'aprisionamento fluxo hold',
          idempotencyKey: body.idempotencyKey,
          amount: body.amount,
          payerAccount: body.payerAccount,
          receiverAccount: body.receiverAccount,
          requestId: body.requestId,
          hold: hold,
        },
      });

      await this.transactionService.complete(queryRunner, savedTransaction);

      const resp = this.buildResponse(savedTransaction, journal, hold, 0);

      await this.idempotencyService.updateWithQueryRunner(
        queryRunner,
        idempotency.setAsCompleted(resp),
      );

      await this.ormService.commit(queryRunner);

      this.logger.log(
        `[${body.requestId}] PIX (mesma instituição) concluído com sucesso`,
      );

      return resp;
    } catch (err: any) {
      this.logger.error(`Erro na criação do hold: ${JSON.stringify(err)}`);
      await this.ormService.rollback(queryRunner);
      throw err;
    } finally {
      await this.ormService.release(queryRunner);
    }
  }

  private buildResponse(
    transaction: Transaction,
    journal: Journal,
    hold: Hold,
    tax: number,
  ) {
    return {
      transactionId: transaction.id,
      amount: transaction.amount,
      currency: transaction.currency.code,
      status: transaction.status,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      journal: journal,
      tax: tax,
      hold: hold.toDto(),
    };
  }
}
