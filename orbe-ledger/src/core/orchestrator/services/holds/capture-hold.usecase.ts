import { Injectable, Logger } from '@nestjs/common';
import { LedgerPostingStrategy } from 'src/core/posting/ledger.posting.strategy';
import { IdempotencyRules } from 'src/core/rules/business/idempotency.rules';
import { AccountsService } from 'src/core/services/accounts.service';
import { HoldService } from 'src/core/services/hold.service';
import { IdempotencyService } from 'src/core/services/idempotency.service';
import { TransactionService } from 'src/core/services/transaction.service';
import { EntityType } from 'src/infra/database/common/enums/idempotency.status';
import { TransactionType } from 'src/infra/database/common/enums/transaction.enum';
import { Account } from 'src/infra/database/entities/account.entity';
import { Hold } from 'src/infra/database/entities/hold.entity';
import { Journal } from 'src/infra/database/entities/journal.entity';
import { Ledger } from 'src/infra/database/entities/ledger.entity';
import { Transaction } from 'src/infra/database/entities/transaction.entity';
import { OrmService } from 'src/infra/database/orm/orm.service';
import { TaxType } from 'src/infra/proxy/_types_/taxes.type';

@Injectable()
export class CaptureHoldUsecase {
  private logger = new Logger(CaptureHoldUsecase.name);
  constructor(
    private readonly ormService: OrmService,
    private accountService: AccountsService,
    private idempotencyService: IdempotencyService,
    private idempotencyRules: IdempotencyRules,
    private transactionService: TransactionService,
    // private ledgerPostingSerive: LedgerPosting,
    private ledgerPostingStrategy: LedgerPostingStrategy,
    private holdService: HoldService,
  ) {}

  async handler(body: {
    hold: Hold;
    payerAccount: Account;
    revenueAccount: Account;
    settlementAccount: Account;
    idempotencyKey: string;
    requestId: string;
    ledger: Ledger;
    taxes?: {
      type: TaxType;
      value: number;
      name: string;
      description: string;
    }[];
  }) {
    const {
      hold,
      payerAccount,
      settlementAccount,
      idempotencyKey,
      revenueAccount,
      requestId,
      ledger,
      taxes
    } = body;
    this.logger.log('release hold usecase running');
    const { queryRunner } = await this.ormService.getQueryRunner();
    try {
      await this.accountService.lockAccountsByIds(queryRunner, [
        settlementAccount.id,
      ]);

      const idempotencyResult = await this.idempotencyRules.validate({
        key: body.idempotencyKey,
        requestId: body.requestId,
      });

      const savedTransaction = await this.transactionService.createTransaction({
        type: TransactionType.HOLD_CAPTURE,
        amount: hold.amount,
        currencyId: hold.currencyId,
        originAccountId: payerAccount.id,
        destinationAccountId: settlementAccount.id,
        correlationId: idempotencyKey,
        externalId: hold.id,
        metadata: {
          holdId: hold.id,
          description: 'Hold capture',
          institutionType: 'HOLD_CAPTURE',
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
          metadata: { created_by: 'SYSTEM', type: 'HOLD_RELEASE' },
          ttl: 86400,
          entityType: EntityType.TRANSACTION,
          entityId: savedTransaction.id,
        }));

      // captura o hold
      hold.capture(hold.amount);
      const updatedHold = await this.holdService.update(queryRunner, hold);

      // Criar journal de release
      const journal = await this.ledgerPostingStrategy.runEstategy({
        type: 'HOLD_CAPTURE',
        queryRunner: queryRunner,
        data: {
          ledger: ledger,
          transaction: savedTransaction,
          description: 'capture fluxo hold',
          idempotencyKey: idempotencyKey,
          amount: hold.amount,
          originalAccount: hold.account,
          payerAccount: payerAccount,
          receiverAccount: settlementAccount,
          revenueAccount: revenueAccount,
          requestId: body.requestId,
          hold: updatedHold,
          taxes
        },
      });

      await this.transactionService.complete(queryRunner, savedTransaction);

      const resp = this.buildResponse(savedTransaction, journal, updatedHold);

      await this.idempotencyService.updateWithQueryRunner(
        queryRunner,
        idempotency.setAsCompleted(resp),
      );

      await this.ormService.commit(queryRunner);

      this.logger.log(`[${body.requestId}] Hold release concluído com sucesso`);

      return resp;
    } catch (err: any) {
      this.logger.error(`Erro na liberação do hold: ${JSON.stringify(err)}`);
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
  ) {
    return {
      transactionId: transaction.id,
      amount: transaction.amount,
      currency: transaction.currency.code,
      status: transaction.status,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      journal: journal,
      hold: hold.toDto(),
    };
  }
}
