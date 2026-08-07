import { Inject, Injectable, Logger } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { CaptureHoldUsecase } from 'src/core/orchestrator/services/holds/capture-hold.usecase';
import { CreateHoldUsecase } from 'src/core/orchestrator/services/holds/create-hold.usecase';
import { ReleaseHoldUsecase } from 'src/core/orchestrator/services/holds/release-hold.usecase';
import { AccountsService } from 'src/core/services/accounts.service';
import { FeeService } from 'src/core/services/fee.service';
import { HoldService as HoldRepository } from 'src/core/services/hold.service';
import { LedgerService } from 'src/core/services/ledger.service';
import { ServiceService } from 'src/core/services/service.service';
import { LedgerCode } from 'src/infra/database/common/enums/ledger.enum';

@Injectable()
export class HoldService {
  private logger = new Logger(HoldService.name);
  constructor(
    @Inject(REQUEST)
    private request: Request,
    private readonly accountService: AccountsService,
    private readonly ledgerService: LedgerService,
    private readonly serviceService: ServiceService,
    private readonly feeService: FeeService,
    private readonly holdService: HoldRepository,
    private readonly holdUsecase: CreateHoldUsecase,
    private readonly releaseHoldUsecase: ReleaseHoldUsecase,
    private readonly captureHoldUsecase: CaptureHoldUsecase,
    // private feeCalculatorService: FeeCalculatorService
  ) {}

  async createHold(dto: { accountNumber: string; amount: number }) {
    const { hash } = this.request;
    try {
      const [account, technicalAccount, ledger, service] = await Promise.all([
        this.accountService.findByNumber(dto.accountNumber),
        this.accountService.findByCode('HOLD-RESERVE'),
        this.ledgerService.getLedgerByCode(LedgerCode.MAIN),
        this.serviceService.getServiceByCode('SRV-HOLD'),
      ]);
      this.accountService.validateAccounts([account, technicalAccount]);

      console.log('contas: ', account, technicalAccount, ledger);
      const response = await this.holdUsecase.handler({
        payerAccount: account,
        receiverAccount: technicalAccount,
        idempotencyKey: hash,
        requestId: hash,
        amount: dto.amount,
        ledger: ledger,
      });
      this.logger.log(`[${hash}] Hold criado: ${JSON.stringify(response)}`);
      return response;
    } catch (err) {
      this.logger.error(
        `[${hash}] Erro na criação do hold: ${JSON.stringify(err)}`,
      );
      throw err;
    }
  }

  async releaseHold(dto: { holdId: string; idempotencyKey: string }) {
    const { hash } = this.request;
    try {
      const [hold, technicalAccount, ledger] = await Promise.all([
        this.holdService.findById(dto.holdId),
        this.accountService.findByCode('HOLD-RESERVE'),
        this.ledgerService.getLedgerByCode(LedgerCode.MAIN),
      ]);

      const response = await this.releaseHoldUsecase.handler({
        hold: hold,
        payerAccount: technicalAccount,
        receiverAccount: hold.account,
        idempotencyKey: dto.idempotencyKey,
        requestId: hash,
        ledger: ledger,
      });
      this.logger.log(`[${hash}] Hold release: ${JSON.stringify(response)}`);
      return response;
    } catch (err) {
      this.logger.error(
        `[${hash}] Erro na liberação do hold: ${JSON.stringify(err)}`,
      );
      throw err;
    }
  }

  async captureHold(dto: { holdId: string; idempotencyKey: string }) {
    const { hash } = this.request;
    try {
      const [
        hold,
        technicalAccount,
        ledger,
        service,
        revenueAccount,
        settlementAccount,
      ] = await Promise.all([
        this.holdService.findById(dto.holdId),
        this.accountService.findByCode('HOLD-RESERVE'),
        this.ledgerService.getLedgerByCode(LedgerCode.MAIN),
        this.serviceService.getServiceByCode('SRV-HOLD'),
        this.accountService.findByCode('REVENUE-HOLD'),
        this.accountService.findByCode('HOLD-SETTLEMENT'),
      ]);

      const response = await this.captureHoldUsecase.handler({
        hold: hold,
        payerAccount: technicalAccount,
        idempotencyKey: dto.idempotencyKey,
        revenueAccount: revenueAccount,
        settlementAccount: settlementAccount,
        requestId: hash,
        ledger: ledger,
        tax: this.feeService.calculateNetAmount(service, hold.amount),
      });
      this.logger.log(`[${hash}] Hold release: ${JSON.stringify(response)}`);
      return response;
    } catch (err) {
      this.logger.error(
        `[${hash}] Erro na liberação do hold: ${JSON.stringify(err)}`,
      );
      throw err;
    }
  }
}
