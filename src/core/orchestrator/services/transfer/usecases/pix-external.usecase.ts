import { Injectable, Logger } from '@nestjs/common';
import { LedgerPosting } from 'src/core/posting/ledger.posting';
import { IdempotencyRules } from 'src/core/rules/business/idempotency.rules';
import { TransferRules } from 'src/core/rules/business/transfer.rules';
import { AccountsService } from 'src/core/services/accounts.service';
import { AuditService } from 'src/core/services/audit.service';
import { IdempotencyService } from 'src/core/services/idempotency.service';
import { TransactionService } from 'src/core/services/transaction.service';
import { DataSource } from 'typeorm';
import { SagaService } from '../../../../services/saga.service';
import { Account } from 'src/infra/database/entities/account.entity';
import { TransactionType } from 'src/infra/database/common/enums/transaction.enum';
import { SagaStepType } from 'src/infra/database/common/enums/saga.enum';

@Injectable()
export class PixExternalUsecase {
  private logger = new Logger(PixExternalUsecase.name);
  constructor(
    private readonly sagaService: SagaService,
    private readonly idempotencyService: IdempotencyService,
    private readonly accountService: AccountsService,
    private readonly auditService: AuditService,
    private readonly transactionService: TransactionService,
    private readonly dataSource: DataSource,
    private readonly transferRules: TransferRules,
    private readonly idempotencyRules: IdempotencyRules,
    private readonly ledgerPostingSerive: LedgerPosting,
  ) {}

  private async getQueryRunner() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    return { queryRunner };
  }

  async handler(body: {
    accountOrigin: Account;
    idempotencyKey: string;
    requestId: string;
    amount: number;
    pixKey: string;
    description: string;
  }) {
    const { queryRunner } = await this.getQueryRunner();
    try {
      await this.accountService.lockAccountsByIds(queryRunner, [
        body.accountOrigin.id,
      ]);

      const idempotencyResult = await this.idempotencyRules.validate({
        key: body.idempotencyKey,
        requestId: body.requestId,
      });

      console.log('idempotency result: ', idempotencyResult);
      const { payerAccount } = await this.transferRules.validatePayer({
        payerAccount: body.accountOrigin,
        amount: body.amount,
      });

      const savedTransaction = await this.transactionService.createTransaction({
        type: TransactionType.PIX_EXTERNAL,
        amount: body.amount,
        currencyId: payerAccount.currencyId,
        originAccountId: payerAccount.id,
        destinationAccountId: undefined,
        correlationId: body.idempotencyKey,
        externalId: body.idempotencyKey,
        metadata: {
          pixKey: body.pixKey,
          description: body.description,
          institutionType: 'CROSS_INSTITUTION',
          startedAt: new Date().toISOString(),
          data: body,
        },
      });

      /**steps
       *PIX_OUT_PENDING
       *PIX_OUT_SENT
       *PIX_OUT_CONFIRMED
       *PIX_IN_PENDING
       *PIX_IN_CONFIRMED
       *SPI_SETTLEMENT
       *BACEN_RESERVE
       *CLEARING
       *SETTLEMENT_PENDING
       *SETTLEMENT_COMPLETED
       */
      const createSage = await this.sagaService.createSaga({
        transaction: savedTransaction,
        steps: [
          {
            name: 'PIX_OUT_PENDING',
            step: 1,
            type: SagaStepType.DEBIT,
            inputData: {
              startedAt: new Date().toISOString(),
              pixKey: body.pixKey,
              description: body.description,
              amount: body.amount,
            },
          },
          {
            name: 'PIX_OUT_SENT',
            step: 1,
            type: SagaStepType.EXTERNAL_API,
            inputData: {
              startedAt: new Date().toISOString(),
              pixKey: body.pixKey,
              description: body.description,
              amount: body.amount,
            },
          },
          {
            name: 'PIX_OUT_CONFIRMED',
            step: 1,
            type: SagaStepType.NOTIFICATION,
            inputData: {
              startedAt: new Date().toISOString(),
              pixKey: body.pixKey,
              description: body.description,
              amount: body.amount,
            },
          },
        ],
      });

      // await queryRunner.commitTransaction();

      return {
        msg: 'pix external runnig',
      };
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `[${body.requestId}] Erro na transferência PIX: ${err.message}`,
      );
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
