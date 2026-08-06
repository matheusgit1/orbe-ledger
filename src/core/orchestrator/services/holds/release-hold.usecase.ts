import { Injectable, Logger } from '@nestjs/common';
import { LedgerPosting } from 'src/core/posting/ledger.posting';
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

@Injectable()
export class ReleaseHoldUsecase {
  private logger = new Logger(ReleaseHoldUsecase.name);
  constructor(
    private readonly ormService: OrmService,
    private accountService: AccountsService,
    private idempotencyService: IdempotencyService,
    private idempotencyRules: IdempotencyRules,
    private transactionService: TransactionService,
    private ledgerPostingSerive: LedgerPosting,
    private holdService: HoldService,
  ) {}

  async handler(body: {
    hold: Hold;
    payerAccount: Account;
    receiverAccount: Account;
    idempotencyKey: string;
    requestId: string;
    ledger: Ledger;
  }) {
    const {
      hold,
      payerAccount,
      receiverAccount,
      idempotencyKey,
      requestId,
      ledger,
    } = body;
    this.logger.log('release hold usecase running');
    const { queryRunner } = await this.ormService.getQueryRunner();
    try {
      // if (!hold.canRelease()) {
      //   //atualizar para EXPIRED
      //   throw new Error(
      //     `Hold cannot be released. Status: ${hold.status}, Expires at: ${hold.expiresAt}`,
      //   );
      // }

      await this.accountService.lockAccountsByIds(queryRunner, [
        receiverAccount.id,
      ]);

      const idempotencyResult = await this.idempotencyRules.validate({
        key: body.idempotencyKey,
        requestId: body.requestId,
      });

      const savedTransaction = await this.transactionService.createTransaction({
        type: TransactionType.HOLD_RELEASE,
        amount: hold.amount,
        currencyId: hold.currencyId,
        originAccountId: payerAccount.id,
        destinationAccountId: receiverAccount.id,
        correlationId: idempotencyKey,
        externalId: hold.id,
        metadata: {
          holdId: hold.id,
          description: 'Hold release',
          institutionType: 'RELEASE',
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

      // Liberar o hold
      hold.release('Manual release');
      const updatedHold = await this.holdService.update(queryRunner, hold);

      // Criar journal de release
      const journal = await this.ledgerPostingSerive.postHoldRelease(
        queryRunner,
        {
          ledger: ledger,
          transaction: savedTransaction,
          description: 'liberação fluxo hold',
          idempotencyKey: idempotencyKey,
          amount: hold.amount,
          payerAccount: payerAccount,
          receiverAccount: receiverAccount,
          requestId: body.requestId,
          hold: updatedHold,
        },
      );

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
