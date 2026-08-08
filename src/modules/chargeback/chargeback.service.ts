import { Inject, Injectable, Logger } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { ChargebackUsecase } from 'src/core/orchestrator/services/chargeback/chargeback.usecase';
import { CaptureHoldUsecase } from 'src/core/orchestrator/services/holds/capture-hold.usecase';
import { CreateHoldUsecase } from 'src/core/orchestrator/services/holds/create-hold.usecase';
import { ReleaseHoldUsecase } from 'src/core/orchestrator/services/holds/release-hold.usecase';
import { AccountsService } from 'src/core/services/accounts.service';
import { FeeService } from 'src/core/services/fee.service';
import { HoldService } from 'src/core/services/hold.service';
import { LedgerService } from 'src/core/services/ledger.service';
import { ServiceService } from 'src/core/services/service.service';
import { TransactionService } from 'src/core/services/transaction.service';
// import { HoldService } from '../hold/hold.service';

@Injectable()
export class ChargebackService {
  private logger = new Logger(ChargebackService.name);
  constructor(
    @Inject(REQUEST)
    private request: Request,
    private readonly accountService: AccountsService,
    private readonly ledgerService: LedgerService,
    private readonly serviceService: ServiceService,
    private readonly feeService: FeeService,
    private readonly holdService: HoldService,
    private readonly holdUsecase: CreateHoldUsecase,
    private readonly releaseHoldUsecase: ReleaseHoldUsecase,
    private readonly captureHoldUsecase: CaptureHoldUsecase,
    private readonly transactionService: TransactionService,
    private readonly chargebackUsecase: ChargebackUsecase,
  ) {}

  async rollback(data: { type: 'HOLD', transactionId: string; idempotencyKey: string }) {
    try {
      const transaction = await this.transactionService.findTransactionById(
        data.transactionId,
      );
      if (!transaction) {
        throw new Error('Transaction not found');
      }
      return await this.chargebackUsecase.handler({
        originalTransaction: transaction,
      });
    } catch (err) {
      this.logger.error('Error rolling back chargeback', err);
      throw err;
    } finally {
      this.logger.debug('Chargeback completed');
    }
  }
}
